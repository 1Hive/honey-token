const { assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { assertRevert } = require("../helpers/assertThrow");
const { bn, bigExp } = require('@aragon/contract-helpers-test')

const ArbitrumBridgeReceiver = artifacts.require("ArbitrumBridgeReceiver")
const Honey = artifacts.require("Honey")
const ArbitrumOutbox = artifacts.require("ArbitrumOutboxMock")
const ArbitrumBridge = artifacts.require("ArbitrumBridgeMock")
const ArbitrumInbox = artifacts.require("ArbitrumInboxMock")
const ArbitrumGatewayRouter = artifacts.require("ArbitrumGatewayRouterMock")

contract('ArbitrumBridgeReceiver', ([deployer, l2Issuance, l2Governance, gatewayRouter, gateway]) => {

  let arbitrumBridgeReceiver, honey, arbitrumOutbox

  const honeyV1TotalSupply = bigExp(30000, 18)
  const multiplier = bn(1000)
  const honeyV2TotalSupply = honeyV1TotalSupply.mul(multiplier)

  beforeEach(async () => {
    honey = await Honey.new(deployer, deployer, gatewayRouter, gateway)
    arbitrumOutbox = await ArbitrumOutbox.new(l2Issuance)
    const arbitrumBridge = await ArbitrumBridge.new(arbitrumOutbox.address)
    const arbitrumInbox = await ArbitrumInbox.new(arbitrumBridge.address)
    const arbitrumGatewayRouter = await ArbitrumGatewayRouter.new(honey.address, gateway)

    arbitrumBridgeReceiver = await ArbitrumBridgeReceiver.new(honey.address, l2Issuance, l2Governance,
      arbitrumInbox.address, arbitrumGatewayRouter.address)
  })

  it('sets correct constructor params', async () => {

  })
})
