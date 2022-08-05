# algofi-amm-js-sdk

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/Algofiorg/algofi-amm-js-sdk/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/gh/Algofiorg/algofi-amm-js-sdk/tree/main)

Official Javascript SDK for the Algofi AMM + NanoSwap protocols

## Documentation
https://algofiorg.github.io/algofi-amm-js-sdk/

## Design Goal
This SDK is useful for developers who want to programatically interact with the Algofi AMM + NanoSwap protocols.

## Status
This SDK is currently under active early development and should not be considered stable.

## Installation

### [Node.js](https://nodejs.org/en/download/)

```
git clone git@github.com:Algofiorg/algofi-amm-js-sdk.git && cd algofi-amm-js-sdk
npm install
cd test && npm install && cd ..
```

## Generate Documentation

To generate docs, cd into the root folder and run

```
npx typedoc --out docs src/index.ts
```

# License

algofi-amm-js-sdk is licensed under a MIT license except for the exceptions listed below. See the LICENSE file for details.
