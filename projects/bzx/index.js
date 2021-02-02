/*==================================================
  Modules
==================================================*/

const sdk = require('../../sdk');
const BigNumber = require('bignumber.js');
const _ = require('underscore');

const abi = require('./abi');
const registry = require('./registry');
const itoken = require('./itoken');
const bpt = require('./bpt');
const { sum } = require('../../sdk/util');


let iTokens = [
  // sUSD
  {
    iTokenAddress: "0x49f4592E641820e928F9919Ef4aBd92a719B4b49",
    underlyingAddress: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51"
  },
  // CHAI
  {
    iTokenAddress: "0x493C57C4763932315A328269E1ADaD09653B9081",
    underlyingAddress: "0x06AF07097C9Eeb7fD685c692751D5C66dB49c215"
  },
];

let iTokensNew = [];
let wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let bzrxTokenAddress = "0x56d811088235F11C8920698a204A5010a788f4b3";
let bptTokenAddress = "0xe26A220a341EAca116bDa64cF9D5638A935ae629";
let vbzrxTokenAddress = "0xB72B31907C1C95F3650b64b2469e08EdACeE5e8F";
let bzxLetacyProtocolAddress = "0x8b3d70d628ebd30d4a2ea82db95ba2e906c71633";
let bzxProtocolAddress = "0xd8ee69652e4e4838f2531732a46d1f7f584f0b7f";

let bzxStakingAddress = "0xe95Ebce2B02Ee07dEF5Ed6B53289801F7Fc137A4";
let stakingDeployBlock = 11732105

let legacyRegistryContractAddress = "0xD8dc30d298CCf40042991cB4B96A540d8aFFE73a";
let registryContractAddress = "0xf0E474592B455579Fe580D610b846BdBb529C6F7";

let mkrAddress = "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2";

let v2DeployBlock = 10829970;
let v2VestingDeployBlock = 10441197;
/*==================================================
  Main
  ==================================================*/

async function tvl(timestamp, block) {
  let balances = {};
  console.log("block", block)
  const getTokensResultLegacy = await sdk.api.abi.call({
    block,
    target: legacyRegistryContractAddress,
    params: [0, 200, 0],
    abi: abi["getTokens"]
  });

  _.each(getTokensResultLegacy.output, (token) => {
    if (token[4] === '1') {
      iTokens.push({
        iTokenAddress: token[0],
        underlyingAddress: token[1]
      });
    }
  });

  if (block > v2DeployBlock) {
    const getTokensResult = await sdk.api.abi.call({
      block,
      target: registryContractAddress,
      params: [0, 200],
      abi: registry["getTokens"]
    });

    _.each(getTokensResult.output, (token) => {
      iTokensNew.push({
        iTokenAddress: token[0],
        underlyingAddress: token[1]
      });
    });
  }
  iTokens = iTokens.concat(iTokensNew);
  const iTokenCalls = _.map(iTokens, (iToken) => ({
    target: iToken.iTokenAddress
  }));

  const supplyResult = await sdk.api.abi.multiCall({
    block,
    calls: iTokenCalls,
    abi: abi["totalAssetSupply"]
  });

  const borrowResult = await sdk.api.abi.multiCall({
    block,
    calls: iTokenCalls,
    abi: abi["totalAssetBorrow"]
  });

  _.each(iTokens, (iToken) => {
    const supply = _.find(supplyResult.output, (result) => (result.input.target === iToken.iTokenAddress));
    const borrow = _.find(borrowResult.output, (result) => (result.input.target === iToken.iTokenAddress));

    if (supply.success && borrow.success) {
      const totalSupply = supply.output;
      const totalBorrow = borrow.output;
      balances[iToken.underlyingAddress.toUpperCase()] = BigNumber(totalSupply).minus(totalBorrow).toFixed();
    }
  });

  const kyberTokens = (await sdk.api.util.kyberTokens()).output;

  // Legacy bZx address
  balanceOfCallsLegacy = [
    ..._.map(kyberTokens, (data, address) => ({
      target: address,
      params: bzxLetacyProtocolAddress
    }))
  ];

  // new bZx address
  balanceOfCalls = [
    ..._.map(kyberTokens, (data, address) => ({
      target: address,
      params: bzxProtocolAddress
    }))
  ];

  const balanceOfResultLegacy = await sdk.api.abi.multiCall({
    block,
    calls: balanceOfCallsLegacy,
    abi: 'erc20:balanceOf',
  });

  const balanceOfResult = await sdk.api.abi.multiCall({
    block,
    calls: balanceOfCalls,
    abi: 'erc20:balanceOf',
  });

  let balanceOfvBZRX = {}
  if (block > v2VestingDeployBlock) {
    balanceOfvBZRX = await sdk.api.abi.call({
      target: vbzrxTokenAddress,
      params: bzxProtocolAddress,
      abi: 'erc20:balanceOf',
      block
    });
  }

 
  if (block > stakingDeployBlock) {
    console.log("a", block)
    balanceOfvBZRXOnStakingContract = await sdk.api.abi.call({
      target: vbzrxTokenAddress,
      params: bzxStakingAddress,
      abi: 'erc20:balanceOf',
      block
    });
    console.log("b")
    balanceOfBZRXOnStakingContract = await sdk.api.abi.call({
      target: bzrxTokenAddress,
      params: bzxStakingAddress,
      abi: 'erc20:balanceOf',
      block
    });
    console.log("c")
    totalSupplyOfBPT = await sdk.api.abi.call({
      target: bptTokenAddress,
      abi: bpt["totalSupply"],
      block
    });
    console.log("d")
    balanceOfBPT = await sdk.api.abi.call({
      target: bptTokenAddress,
      params: bzxStakingAddress,
      abi: 'erc20:balanceOf',
      block
    });
    console.log("e")
    balanceOfWETHOnBPT = await sdk.api.abi.call({
      target: bptTokenAddress,
      params: wethTokenAddress,
      abi: bpt["getBalance"],
      block
    });
    console.log("f")
    balanceOfBZRXOnBPT = await sdk.api.abi.call({
      target: bptTokenAddress,
      params: bzrxTokenAddress,
      abi: bpt["getBalance"],
      block
    });

    ratioToTotalSupply = balanceOfBPT / totalSupplyOfBPT;
    console.log("balanceOfBZRXOnBPT", balanceOfBZRXOnBPT);
    console.log("balanceOfWETHOnBPT", balanceOfWETHOnBPT);
    console.log("balanceOfBPT", balanceOfBPT);
    console.log("totalSupplyOfBPT", totalSupplyOfBPT);
    console.log("balanceOfBZRXOnStakingContract", balanceOfBZRXOnStakingContract);
    console.log("balanceOfvBZRXOnStakingContract", balanceOfvBZRXOnStakingContract);
    console.log("here-1", balances[wethTokenAddress.toUpperCase()], balances[bzrxTokenAddress.toUpperCase()])
    
    
    if (balanceOfWETHOnBPT.output) {
      balance = BigNumber(balanceOfWETHOnBPT.output);
      beforeBalance = BigNumber(balances[wethTokenAddress.toUpperCase()]);
      if (beforeBalance.isNaN()) {
        beforeBalance = new BigNumber(0);
      }
      total = beforeBalance.plus(balance).toFixed();
      balances[wethTokenAddress.toUpperCase()] = total;
    }

    // balances[wethTokenAddress.toUpperCase()] += BigNumber(balanceOfWETHOnBPT * ratioToTotalSupply)
    addBalances(balances, {output: balanceOfWETHOnBPT * ratioToTotalSupply}, wethTokenAddress);
    // balances[bzrxTokenAddress.toUpperCase()] += BigNumber(balanceOfBZRXOnBPT * ratioToTotalSupply)
    addBalances(balances, {output: balanceOfBZRXOnBPT * ratioToTotalSupply}, bzrxTokenAddress);

    console.log("here0")
    addBalances(balances, balanceOfBZRXOnStakingContract, bzrxTokenAddress);
    addBalances(balances, balanceOfvBZRXOnStakingContract, vbzrxTokenAddress);
    // if (balanceOfBZRXOnStakingContract.output) {
    //   balance = BigNumber(balanceOfBZRXOnStakingContract.output);
    //   beforeBalance = BigNumber(balances[bzrxTokenAddress.toUpperCase()]);
    //   if (beforeBalance.isNaN()) {
    //     beforeBalance = new BigNumber(0);
    //   }
    //   total = beforeBalance.plus(balance).toFixed();
    //   balances[bzrxTokenAddress.toUpperCase()] = total;
    // }
    // console.log("here1")
    // if (balanceOfvBZRXOnStakingContract.output) {
    //   console.log("here2")
    //   balance = BigNumber(balanceOfvBZRXOnStakingContract.output);
    //   beforeBalance = BigNumber(balances[vbzrxTokenAddress.toUpperCase()]);
    //   console.log("here3")
    //   if (beforeBalance.isNaN()) {
    //     beforeBalance = new BigNumber(0);
    //   }
    //   total = beforeBalance.plus(balance).toFixed();
    //   balances[vbzrxTokenAddress.toUpperCase()] = total;
    // }
  }

  function sumMultiBalanceOf(balances, results) {
    _.each(results.output, (result) => {
      if (result.success) {
        let address = result.input.target;
        let balance = result.output;

        if (BigNumber(balance).toNumber() <= 0) {
          return;
        }
        balances[address.toUpperCase()] = BigNumber(balances[address.toUpperCase()] || 0).plus(balance).toFixed();
      }
    });
  }


  function addBalances(balances, balanceOfToken, token) {
    if (balanceOfToken.output) {
      balance = BigNumber(balanceOfToken.output);
      beforeBalance = BigNumber(balances[token.toUpperCase()]);
      if (beforeBalance.isNaN()) {
        beforeBalance = new BigNumber(0);
      }
      total = beforeBalance.plus(balance).toFixed();
      balances[token.toUpperCase()] = total;
    }
  }

  sumMultiBalanceOf(balances, balanceOfResultLegacy);
  sumMultiBalanceOf(balances, balanceOfResult);

  // if (balanceOfvBZRX.output) {
  //   balance = BigNumber(balanceOfvBZRX.output);
  //   beforeBalance = BigNumber(balances[bzrxTokenAddress.toUpperCase()]);
  //   if (beforeBalance.isNaN()) {
  //     beforeBalance = new BigNumber(0);
  //   }
  //   total = beforeBalance.plus(balance).toFixed();
  //   balances[bzrxTokenAddress.toUpperCase()] = total;
  // }

  addBalances(balances, balanceOfvBZRX, bzrxTokenAddress)

  return balances;
}


/*==================================================
  Rates
  ==================================================*/
async function rates(timestamp, block) {
  let ratesData = { lend: {}, borrow: {}, supply: {} };

  const iTokenCalls = _.map(iTokensNew, (iToken) => ({
    target: iToken.iTokenAddress
  }));

  const supplyInterestRate = await sdk.api.abi.multiCall({
    block,
    calls: iTokenCalls,
    abi: itoken["supplyInterestRate"]
  });

  const borrowInterestRate = await sdk.api.abi.multiCall({
    block,
    calls: iTokenCalls,
    abi: itoken["borrowInterestRate"]
  });

  const totalAssetBorrow = await sdk.api.abi.multiCall({
    block,
    calls: iTokenCalls,
    abi: itoken["totalAssetBorrow"]
  });

  const iTokenUnderlyingCalls = _.map(iTokensNew, (iToken) => ({
    target: iToken.underlyingAddress
  }));

  const underlyingSymbol = await sdk.api.abi.multiCall({
    block,
    calls: iTokenUnderlyingCalls,
    abi: 'erc20:symbol'
  });

  _.each(iTokensNew, (iToken) => {
    const supply = _.find(supplyInterestRate.output, (result) => (result.input.target === iToken.iTokenAddress));
    const borrow = _.find(borrowInterestRate.output, (result) => (result.input.target === iToken.iTokenAddress));
    const totalBorrow = _.find(totalAssetBorrow.output, (result) => (result.input.target === iToken.iTokenAddress));
    let symbol = _.find(underlyingSymbol.output, (result) => (result.input.target === iToken.underlyingAddress));

    if (iToken.underlyingAddress.toUpperCase() == mkrAddress.toUpperCase()) {
      symbol.output = "MKR";
    }

    ratesData.lend[symbol.output] = String(supply.output / 1e18);
    ratesData.borrow[symbol.output] = String(borrow.output / 1e18);
    ratesData.supply[symbol.output] = String(totalBorrow.output);
  });

  return ratesData;
}

/*==================================================
  Exports
  ==================================================*/

module.exports = {
  name: 'bZx',
  token: 'BZRX',
  category: 'lending',
  website: "https://bzx.network",
  start: 1559433540,  // Saturday, June 1, 2019 11:59:00 PM
  tvl,
  rates,
  term: "1 block",
  variability: "medium",
};
