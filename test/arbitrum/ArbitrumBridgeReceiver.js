const { assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { assertRevert } = require("../helpers/assertThrow");
const { bn, bigExp, ZERO_ADDRESS } = require('@aragon/contract-helpers-test')

const ArbitrumBridgeReceiver = artifacts.require("ArbitrumBridgeReceiver")
const Honey = artifacts.require("Honey")
const ArbitrumOutbox = artifacts.require("ArbitrumOutboxMock")
const ArbitrumBridge = artifacts.require("ArbitrumBridgeMock")
const ArbitrumInbox = artifacts.require("ArbitrumInboxMock")
const ArbitrumGatewayRouter = artifacts.require("ArbitrumGatewayRouterMock")

contract('ArbitrumBridgeReceiver', ([deployer, l2Issuance, l2Governance, newAddress, gatewayRouter, gateway]) => {

  let honey, arbitrumOutbox, arbitrumBridge, arbitrumInbox, arbitrumGatewayRouter, arbitrumBridgeReceiver

  beforeEach(async () => {
    honey = await Honey.new(deployer, deployer, gatewayRouter, gateway)
    arbitrumOutbox = await ArbitrumOutbox.new(l2Issuance)
    arbitrumBridge = await ArbitrumBridge.new(arbitrumOutbox.address)
    arbitrumInbox = await ArbitrumInbox.new(arbitrumBridge.address)
    arbitrumGatewayRouter = await ArbitrumGatewayRouter.new(honey.address, gateway)

    arbitrumBridgeReceiver = await ArbitrumBridgeReceiver.new(honey.address, l2Issuance, l2Governance,
      arbitrumInbox.address, arbitrumGatewayRouter.address)
    await honey.changeIssuer(arbitrumBridgeReceiver.address)
    await honey.changeGatewaySetter(arbitrumBridgeReceiver.address)
  })

  it('sets correct constructor params', async () => {
    assert.equal(await arbitrumBridgeReceiver.honey(), honey.address, "Incorrect honey address")
    assert.equal(await arbitrumBridgeReceiver.l2IssuanceAddress(), l2Issuance, "Incorrect l2IssuanceAddress address")
    assert.equal(await arbitrumBridgeReceiver.l2GovernanceAddress(), l2Governance, "Incorrect l2GovernanceAddress address")
    assert.equal(await arbitrumBridgeReceiver.arbitrumInbox(), arbitrumInbox.address, "Incorrect arbitrumInbox address")
    assert.equal(await arbitrumBridgeReceiver.arbitrumGatewayRouter(), arbitrumGatewayRouter.address, "Incorrect arbitrumGatewayRouter address")
  })

  const itUpdatesAndRevertsAsExpected = (updateAddressFunction, fieldToCheck) => {
    it('updates address as expected', async () => {
      await arbitrumOutbox.setL2ToL1Sender(l2Governance)
      const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[updateAddressFunction](newAddress).encodeABI()
      await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress)
      assert.equal(await arbitrumBridgeReceiver[fieldToCheck](), newAddress, "Incorrect new address")
    })

    it('reverts when l2tol1sender is incorrect', async () => {
      const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[updateAddressFunction](newAddress).encodeABI()
      await assertRevert(arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress), "ERR:NOT_GOVERNANCE")
    })

    it('reverts when not called from bridge', async () => {
      await assertRevert(arbitrumBridgeReceiver[updateAddressFunction](newAddress), "ERR:NOT_FROM_BRIDGE")
    })

    it('reverts when l2tol2sender is zero address', async () => {
      await arbitrumOutbox.setL2ToL1Sender(ZERO_ADDRESS)
      const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[updateAddressFunction](newAddress).encodeABI()
      await assertRevert(arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress), "ERR:NO_SENDER")
    })
  }

  context.only('updateGovernanceAddress(address _l2GovernanceAddress)', () => {

    itUpdatesAndRevertsAsExpected("updateGovernanceAddress", "l2GovernanceAddress")

    it('updates governance address twice', async () => {
      await arbitrumOutbox.setL2ToL1Sender(l2Governance)
      const callDataNewAddress = arbitrumBridgeReceiver.contract.methods.updateGovernanceAddress(newAddress).encodeABI()
      await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress)
      assert.equal(await arbitrumBridgeReceiver.l2GovernanceAddress(), newAddress, "Incorrect new address")

      await arbitrumOutbox.setL2ToL1Sender(newAddress)
      const callDataOldAddress = arbitrumBridgeReceiver.contract.methods.updateGovernanceAddress(l2Governance).encodeABI()
      await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataOldAddress)
      assert.equal(await arbitrumBridgeReceiver.l2GovernanceAddress(), l2Governance, "Incorrect old address")
    })
  })

  context.only('updateIssuanceAddress(address _l2IssuanceAddress)', () => {
    itUpdatesAndRevertsAsExpected("updateIssuanceAddress", "l2IssuanceAddress")
  })

  context.only('updateArbitrumInbox(ArbitrumInbox _arbitrumInbox)', () => {
    itUpdatesAndRevertsAsExpected("updateArbitrumInbox", "arbitrumInbox")
  })
})
