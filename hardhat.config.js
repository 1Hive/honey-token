require("@nomiclabs/hardhat-truffle5")

module.exports = {
  networks: {
    mainnet: {
      url: 'https://mainnet.infura.io/v3/7a03fcb37be7479da06f92c5117afd47',
      accounts: [process.env.ETH_KEY]
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/7a03fcb37be7479da06f92c5117afd47',
      accounts: [process.env.ETH_KEY],
    },
  },
  solidity: {
    version: '0.5.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      }
    }
  },
}
