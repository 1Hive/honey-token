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
  context.only('Contract', () => {

    let honey, arbitrumOutbox, arbitrumBridge, arbitrumInbox, arbitrumGatewayRouter, arbitrumBridgeReceiver

    const honeySupply = bigExp(1000000, 18)

    beforeEach(async () => {
      honey = await Honey.new(deployer, deployer, gatewayRouter, gateway)
      arbitrumOutbox = await ArbitrumOutbox.new(deployer)
      arbitrumBridge = await ArbitrumBridge.new(arbitrumOutbox.address)
      arbitrumInbox = await ArbitrumInbox.new(arbitrumBridge.address)
      arbitrumGatewayRouter = await ArbitrumGatewayRouter.new(honey.address, gateway)

      arbitrumBridgeReceiver = await ArbitrumBridgeReceiver.new(honey.address, l2Issuance, l2Governance,
        arbitrumInbox.address, arbitrumGatewayRouter.address)
      await honey.mint(gateway, honeySupply)
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

    const itUpdatesBridgeReceiverAsExpected = (updateAddressFunction, fieldToCheck) => {
      it('updates address as expected', async () => {
        await arbitrumOutbox.setL2ToL1Sender(l2Governance)
        const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[updateAddressFunction](newAddress).encodeABI()
        await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress)
        assert.equal(await arbitrumBridgeReceiver[fieldToCheck](), newAddress, "Incorrect new address")
      })
    }

    const itUpdatesHoneyAsExpected = (updateAddressFunction, fieldToCheck) => {
      it("updates issuance address on honey token", async () => {
        await arbitrumOutbox.setL2ToL1Sender(l2Governance)
        const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[updateAddressFunction](newAddress).encodeABI()
        await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress)
        assert.equal(await honey[fieldToCheck](), newAddress, 'Incorrect new address')
      })
    }

    const itRevertsUpdateFunctionAsExpected = (updateAddressFunction) => {
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

    const itRevertsIssuanceFunctionAsExpected = (issuanceFunction) => {
      const issueAmount = bigExp(123, 18)

      it('reverts when l2tol1sender is incorrect', async () => {
        const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[issuanceFunction](issueAmount).encodeABI()
        await assertRevert(arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress), "ERR:NOT_ISSUANCE")
      })

      it('reverts when not called from bridge', async () => {
        await assertRevert(arbitrumBridgeReceiver[issuanceFunction](issueAmount), "ERR:NOT_FROM_BRIDGE")
      })

      it('reverts when l2tol2sender is zero address', async () => {
        await arbitrumOutbox.setL2ToL1Sender(ZERO_ADDRESS)
        const callDataNewAddress = arbitrumBridgeReceiver.contract.methods[issuanceFunction](issueAmount).encodeABI()
        await assertRevert(arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress), "ERR:NO_SENDER")
      })
    }

    context('updateGovernanceAddress(address _l2GovernanceAddress)', () => {

      itUpdatesBridgeReceiverAsExpected("updateGovernanceAddress", "l2GovernanceAddress")

      itRevertsUpdateFunctionAsExpected("updateGovernanceAddress")

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

    context('updateIssuanceAddress(address _l2IssuanceAddress)', () => {
      itUpdatesBridgeReceiverAsExpected("updateIssuanceAddress", "l2IssuanceAddress")

      itRevertsUpdateFunctionAsExpected("updateIssuanceAddress")
    })

    context('updateArbitrumInbox(ArbitrumInbox _arbitrumInbox)', () => {
      itUpdatesBridgeReceiverAsExpected("updateArbitrumInbox", "arbitrumInbox")

      itRevertsUpdateFunctionAsExpected("updateArbitrumInbox", "arbitrumInbox")
    })

    context('updateHoneyIssuer(address _issuer)', () => {
      itUpdatesHoneyAsExpected("updateHoneyIssuer", "issuer")

      itRevertsUpdateFunctionAsExpected("updateHoneyIssuer")
    })

    context('updateHoneyGatewaySetter(address _gatewaySetter)', () => {
      itUpdatesHoneyAsExpected("updateHoneyGatewaySetter", "gatewaySetter")

      itRevertsUpdateFunctionAsExpected("updateHoneyGatewaySetter")
    })

    context('updateHoneyGatewayRouter(ArbitrumGatewayRouter _gatewayRouter)', () => {
      itUpdatesHoneyAsExpected("updateHoneyGatewayRouter", "gatewayRouter")

      itRevertsUpdateFunctionAsExpected("updateHoneyGatewayRouter")
    })

    context('updateHoneyGateway(ArbitrumCustomGateway _gateway)', () => {
      itUpdatesHoneyAsExpected("updateHoneyGateway", "gateway")

      itRevertsUpdateFunctionAsExpected("updateHoneyGateway")
    })

    context('mintHoney(uint256 _amount)', () => {
      it('mints honey to the correct address', async () => {
        const mintAmount = bigExp(123, 18)
        const totalSupplyBefore = await honey.totalSupply()
        const balanceBefore = await honey.balanceOf(gateway)
        await arbitrumOutbox.setL2ToL1Sender(l2Issuance)
        const callDataNewAddress = arbitrumBridgeReceiver.contract.methods.mintHoney(mintAmount).encodeABI()

        await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress)

        assertBn(await honey.totalSupply(), totalSupplyBefore.add(mintAmount), 'Incorrect totalSupply')
        assertBn(await honey.balanceOf(gateway), balanceBefore.add(mintAmount), 'Incorrect gateway balance')
      })

      itRevertsIssuanceFunctionAsExpected("mintHoney")
    })

    context('burnHoney(uint256 _amount)', () => {
      it('burns honey from the correct address', async () => {
        const burnAmount = bigExp(123, 18)
        const totalSupplyBefore = await honey.totalSupply()
        const balanceBefore = await honey.balanceOf(gateway)
        await arbitrumOutbox.setL2ToL1Sender(l2Issuance)
        const callDataNewAddress = arbitrumBridgeReceiver.contract.methods.burnHoney(burnAmount).encodeABI()

        await arbitrumBridge.executeCall(arbitrumBridgeReceiver.address, callDataNewAddress)

        assertBn(await honey.totalSupply(), totalSupplyBefore.sub(burnAmount), 'Incorrect totalSupply')
        assertBn(await honey.balanceOf(gateway), balanceBefore.sub(burnAmount), 'Incorrect gateway balance')
      })

      itRevertsIssuanceFunctionAsExpected("burnHoney")
    })
  })
})
