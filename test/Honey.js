const { ecsign, ecrecover } = require('ethereumjs-util')
const { keccak256 } = require('web3-utils')
const { bn, MAX_UINT256, ZERO_ADDRESS } = require('@aragon/contract-helpers-test')
const { assertBn, assertEvent } = require('@aragon/contract-helpers-test/src/asserts')
const { assertRevert } = require("./helpers/assertThrow");
const { createDomainSeparator } = require('./helpers/erc712')
const { createPermitDigest, PERMIT_TYPEHASH } = require('./helpers/erc2612')
const { createTransferWithAuthorizationDigest, TRANSFER_WITH_AUTHORIZATION_TYPEHASH } = require('./helpers/erc3009')
const { tokenAmount } = require('./helpers/tokens')

const Honey = artifacts.require('Honey')
const Gateway = artifacts.require('GatewayMock')
const GatewayRouter = artifacts.require('GatewayRouterMock')

contract('Honey', ([_, issuer, newIssuer, holder1, holder2, newHolder, gatewaySetter, hnyl2, creditBackAddress]) => {
  let hny, gateway, gatewayRouter

  async function itTransfersCorrectly(fn, { from, to, value }) {
    const isMint = from === ZERO_ADDRESS
    const isBurn = to === ZERO_ADDRESS

    const prevFromBal = await hny.balanceOf(from)
    const prevToBal = await hny.balanceOf(to)
    const prevSupply = await hny.totalSupply()

    const receipt = await fn(from, to, value)

    if (isMint) {
      assertBn(await hny.balanceOf(to), prevToBal.add(value), 'mint: to balance')
      assertBn(await hny.totalSupply(), prevSupply.add(value), 'mint: total supply')
    } else if (isBurn) {
      assertBn(await hny.balanceOf(from), prevFromBal.sub(value), 'burn: from balance')
      assertBn(await hny.totalSupply(), prevSupply.sub(value), 'burn: total supply')
    } else {
      assertBn(await hny.balanceOf(from), prevFromBal.sub(value), 'transfer: from balance')
      assertBn(await hny.balanceOf(to), prevToBal.add(value), 'transfer: to balance')
      assertBn(await hny.totalSupply(), prevSupply, 'transfer: total supply')
    }

    assertEvent(receipt, 'Transfer', { expectedArgs: { from, to, value } })
  }

  async function itApprovesCorrectly(fn, { owner, spender, value }) {
    const receipt = await fn(owner, spender, value)

    assertBn(await hny.allowance(owner, spender), value, 'approve: allowance')
    assertEvent(receipt, 'Approval', { expectedArgs: { owner, spender, value } })
  }

  beforeEach('deploy Honey', async () => {
    gateway = await Gateway.new()
    gatewayRouter = await GatewayRouter.new()
    hny = await Honey.new(issuer, gatewaySetter, gatewayRouter.address, gateway.address)

    await hny.mint(holder1, tokenAmount(100), { from: issuer })
    await hny.mint(holder2, tokenAmount(200), { from: issuer })
  })

  it('set up the token correctly', async () => {
    assert.equal(await hny.name(), 'Honey', 'token: name')
    assert.equal(await hny.symbol(), 'HNY', 'token: symbol')
    assert.equal(await hny.decimals(), '18', 'token: decimals')

    assert.equal(await hny.issuer(), issuer)
    assert.equal(await hny.gatewaySetter(), gatewaySetter)
    assert.equal(await hny.gatewayRouter(), gatewayRouter.address)
    assert.equal(await hny.gateway(), gateway.address)

    assertBn(await hny.totalSupply(), tokenAmount(300))
    assertBn(await hny.balanceOf(holder1), tokenAmount(100))
    assertBn(await hny.balanceOf(holder2), tokenAmount(200))
  })

  context('mints', () => {
    context('is issuer', () => {
      it('can mint tokens', async () => {
        await itTransfersCorrectly(
          (_, to, value) => hny.mint(to, value, { from: issuer }),
          {
            from: ZERO_ADDRESS,
            to: newHolder,
            value: tokenAmount(100)
          }
        )
      })

      it('can change issuer', async () => {
        const receipt = await hny.changeIssuer(newIssuer, { from: issuer })

        assert.equal(await hny.issuer(), newIssuer, 'issuer: changed')
        assertEvent(receipt, 'ChangeIssuer', { expectedArgs: { issuer: newIssuer } })
      })
    })

    context('not issuer', () => {
      it('cannot mint tokens', async () => {
        await assertRevert(hny.mint(newHolder, tokenAmount(100), { from: holder1 }), 'HNY:NOT_ISSUER')
      })

      it('cannot change issuer', async () => {
        await assertRevert(hny.changeIssuer(newIssuer, { from: holder1 }), 'HNY:NOT_ISSUER')
      })
    })
  })

  context('transfers', () => {
    context('holds bag', () => {
      it('can transfer tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.transfer(to, value, { from }),
          {
            from: holder1,
            to: newHolder,
            value: (await hny.balanceOf(holder1)).sub(tokenAmount(1))
          }
        )
      })

      it('can transfer all tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.transfer(to, value, { from }),
          {
            from: holder1,
            to: newHolder,
            value: await hny.balanceOf(holder1)
          }
        )
      })

      it('cannot transfer above balance', async () => {
        await assertRevert(
          hny.transfer(newHolder, (await hny.balanceOf(holder1)).add(bn('1')), { from: holder1 }),
          'MATH:SUB_UNDERFLOW'
        )
      })

      it('cannot transfer to token', async () => {
        await assertRevert(
          hny.transfer(hny.address, bn('1'), { from: holder1 }),
          'HNY:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })

      it('cannot transfer to zero address', async () => {
        await assertRevert(
          hny.transfer(ZERO_ADDRESS, bn('1'), { from: holder1 }),
          'HNY:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })
    })

    context('bagless', () => {
      it('cannot transfer any', async () => {
        await assertRevert(
          hny.transfer(holder1, bn('1'), { from: newHolder }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })
  })

  context('approvals', () => {
    const owner = holder1
    const spender = newHolder

    context('has allowance', () => {
      const value = tokenAmount(50)

      beforeEach(async () => {
        await hny.approve(spender, value, { from: owner })
      })

      it('can change allowance', async () => {
        await itApprovesCorrectly(
          (owner, spender, value) => hny.approve(spender, value, { from: owner }),
          { owner, spender, value: value.add(tokenAmount(10)) }
        )
      })

      it('can transfer below allowance', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.transferFrom(from, to, value, { from: spender }),
          {
            from: owner,
            to: spender,
            value: value.sub(tokenAmount(1))
          }
        )
      })

      it('can transfer all of allowance', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.transferFrom(from, to, value, { from: spender }),
          {
            from: owner,
            to: spender,
            value: value.sub(tokenAmount(1))
          }
        )
      })

      it('cannot transfer above balance', async () => {
        await assertRevert(
          hny.transferFrom(owner, spender, value.add(bn('1')), { from: spender }),
          'MATH:SUB_UNDERFLOW'
        )
      })

      it('cannot transfer to token', async () => {
        await assertRevert(
          hny.transferFrom(owner, hny.address, bn('1'), { from: spender }),
          'HNY:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })

      it('cannot transfer to zero address', async () => {
        await assertRevert(
          hny.transferFrom(owner, ZERO_ADDRESS, bn('1'), { from: spender }),
          'HNY:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })
    })

    context('has infinity allowance', () => {
      beforeEach(async () => {
        await hny.approve(spender, MAX_UINT256, { from: owner })
      })

      it('can change allowance', async () => {
        await itApprovesCorrectly(
          (owner, spender, value) => hny.approve(spender, value, { from: owner }),
          { owner, spender, value: tokenAmount(10) }
        )
      })

      it('can transfer without changing allowance', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.transferFrom(from, to, value, { from: spender }),
          {
            from: owner,
            to: spender,
            value: await hny.balanceOf(owner)
          }
        )

        assertBn(await hny.allowance(owner, spender), MAX_UINT256, 'approve: stays infinity')
      })

      it('cannot transfer above balance', async () => {
        await assertRevert(
          hny.transferFrom(owner, spender, (await hny.balanceOf(owner)).add(bn('1')), { from: spender }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })

    context('no allowance', () => {
      it('can increase allowance', async () => {
        await itApprovesCorrectly(
          (owner, spender, value) => hny.approve(spender, value, { from: owner }),
          { owner, spender, value: tokenAmount(10) }
        )
      })

      it('cannot transfer', async () => {
        await assertRevert(
          hny.transferFrom(owner, spender, bn('1'), { from: spender }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })
  })

  context('burns', () => {
    context('holds bag', () => {
      it('can burn tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.burn(from, value, { from: issuer }),
          {
            from: holder1,
            to: ZERO_ADDRESS,
            value: (await hny.balanceOf(holder1)).sub(tokenAmount(1))
          }
        )
      })

      it('can burn all tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => hny.burn(from, value, { from: issuer }),
          {
            from: holder1,
            to: ZERO_ADDRESS,
            value: await hny.balanceOf(holder1)
          }
        )
      })

      it('cannot burn above balance', async () => {
        await assertRevert(
          hny.burn(holder1, (await hny.balanceOf(holder1)).add(bn('1')), { from: issuer }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })

    context('bagless', () => {
      it('cannot burn any', async () => {
        await assertRevert(
          hny.burn(newHolder, bn('1'), { from: issuer }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })

    it('can burn all tokens', async () => {
      await itTransfersCorrectly(
        (from, to, value) => hny.burn(from, value, { from: issuer }),
        {
          from: holder1,
          to: ZERO_ADDRESS,
          value: await hny.balanceOf(holder1)
        }
      )
      await itTransfersCorrectly(
        (from, to, value) => hny.burn(from, value, { from: issuer }),
        {
          from: holder2,
          to: ZERO_ADDRESS,
          value: await hny.balanceOf(holder2)
        }
      )

      assertBn(await hny.totalSupply(), 0, 'burn: no total supply')
    })

    it('issuer can burn others token', async () => {
      const burnAmount = bn(40)
      const previousBalance = await hny.balanceOf(holder1)
      const previousSupply = await hny.totalSupply()

      await hny.burn(holder1, burnAmount, { from: issuer })

      assertBn(await hny.balanceOf(holder1), previousBalance.sub(burnAmount), "Incorrect user balance")
      assertBn(await hny.totalSupply(), previousSupply.sub(burnAmount), "Incorrect total supply")
    })

    it('nonissuer can not burn others tokens', async () => {
      await assertRevert(hny.burn(holder2, 40, { from: holder1 }), "HNY:NOT_ISSUER")
    })
  })

  context('register with L2', () => {
    context('changeGatewaySetter(address newGatewaySetter)', () => {
      it('reverts when not called by gateway setter', async () => {
        await assertRevert(hny.changeGatewaySetter(holder1, { from: holder1 }), "HNY:NOT_GATEWAY_SETTER")
      })

      it('updates the gateway setter', async () => {
        await hny.changeGatewaySetter(holder1, {from: gatewaySetter })
        assert.equal(await hny.gatewaySetter(), holder1)
      })
    })

    context('changeGatewayRouter(address newGatewayRouter)', () => {
      it('reverts when not called by gateway setter', async () => {
        await assertRevert(hny.changeGatewayRouter(holder1, { from: holder1 }), "HNY:NOT_GATEWAY_SETTER")
      })

      it('updates the gateway router', async () => {
        await hny.changeGatewayRouter(holder1, {from: gatewaySetter })
        assert.equal(await hny.gatewayRouter(), holder1)
      })
    })

    context('changeGateway(address newGateway)', () => {
      it('reverts when not called by gateway setter', async () => {
        await assertRevert(hny.changeGateway(holder1, { from: holder1 }), "HNY:NOT_GATEWAY_SETTER")
      })

      it('updates the gateway', async () => {
        await hny.changeGateway(holder1, {from: gatewaySetter })
        assert.equal(await hny.gateway(), holder1)
      })
    })

    context('is arbitrum enabled', () => {
      it('reverts when not called from registerTokenOnL2() function', async () => {
        await assertRevert(hny.isArbitrumEnabled(), "HNY:NOT_EXPECTED_CALL")
      })
    })

    context('register with gateway', () => {
      it('calls correct function', async () => {
        const maxGas = 111
        const gasPriceBid = 222
        const maxSubmissionCost = 333

        await hny.registerTokenOnL2(hnyl2, maxGas, gasPriceBid, maxSubmissionCost, creditBackAddress, {from: gatewaySetter})

        assert.equal(await gateway.l2Address(), hnyl2)
        assert.equal(await gateway.maxGas(), maxGas)
        assert.equal(await gateway.gasPriceBid(), gasPriceBid)
        assert.equal(await gateway.maxSubmissionCost(), maxSubmissionCost)
        assert.equal(await gateway.creditBackAddress(), creditBackAddress)
      })

      it('reverts when not gateway setter', async () => {
        await assertRevert(hny.registerTokenOnL2(hnyl2, 111, 222, 333, creditBackAddress),'HNY:NOT_GATEWAY_SETTER')
      })
    })

    context('register with gateway router', () => {
      it('calls correct function', async () => {
        const maxGas = 111
        const gasPriceBid = 222
        const maxSubmissionCost = 333

        await hny.registerWithGatewayRouter(maxGas, gasPriceBid, maxSubmissionCost)

        assert.equal(await gatewayRouter.gateway(), gateway.address)
        assert.equal(await gatewayRouter.maxGas(), maxGas)
        assert.equal(await gatewayRouter.gasPriceBid(), gasPriceBid)
        assert.equal(await gatewayRouter.maxSubmissionCost(), maxSubmissionCost)
      })
    })
  })

  context('ERC-712', () => {
    it('has the correct ERC712 domain separator', async () => {
      const domainSeparator = createDomainSeparator(
        await hny.name(),
        bn('1'),
        await hny.getChainId(),
        hny.address
      )
      assert.equal(await hny.getDomainSeparator(), domainSeparator, 'erc712: domain')
    })
  })

  context('ERC-2612', () => {
    let owner, ownerPrivKey
    const spender = newHolder

    async function createPermitSignature(owner, spender, value, nonce, deadline) {
      const digest = await createPermitDigest(hny, owner, spender, value, nonce, deadline)

      const { r, s, v } = ecsign(
        Buffer.from(digest.slice(2), 'hex'),
        Buffer.from(ownerPrivKey.slice(2), 'hex')
      )

      return { r, s, v }
    }

    before(async () => {
      const wallet = web3.eth.accounts.create('erc2612')
      owner = wallet.address
      ownerPrivKey = wallet.privateKey
    })

    beforeEach(async () => {
      await hny.mint(owner, tokenAmount(50), { from: issuer })
    })

    it('has the correct permit typehash', async () => {
      assert.equal(await hny.PERMIT_TYPEHASH(), PERMIT_TYPEHASH, 'erc2612: typehash')
    })

    it('can set allowance through permit', async () => {
      const deadline = MAX_UINT256

      const firstValue = tokenAmount(100)
      const firstNonce = await hny.nonces(owner)
      const firstSig = await createPermitSignature(owner, spender, firstValue, firstNonce, deadline)
      const firstReceipt = await hny.permit(owner, spender, firstValue, deadline, firstSig.v, firstSig.r, firstSig.s)

      assertBn(await hny.allowance(owner, spender), firstValue, 'erc2612: first permit allowance')
      assertBn(await hny.nonces(owner), firstNonce.add(bn(1)), 'erc2612: first permit nonce')
      assertEvent(firstReceipt, 'Approval', { expectedArgs: { owner, spender, value: firstValue } })

      const secondValue = tokenAmount(500)
      const secondNonce = await hny.nonces(owner)
      const secondSig = await createPermitSignature(owner, spender, secondValue, secondNonce, deadline)
      const secondReceipt = await hny.permit(owner, spender, secondValue, deadline, secondSig.v, secondSig.r, secondSig.s)

      assertBn(await hny.allowance(owner, spender), secondValue, 'erc2612: second permit allowance')
      assertBn(await hny.nonces(owner), secondNonce.add(bn(1)), 'erc2612: second permit nonce')
      assertEvent(secondReceipt, 'Approval', { expectedArgs: { owner, spender, value: secondValue } })
    })

    it('cannot use wrong signature', async () => {
      const deadline = MAX_UINT256
      const nonce = await hny.nonces(owner)

      const firstValue = tokenAmount(100)
      const secondValue = tokenAmount(500)
      const firstSig = await createPermitSignature(owner, spender, firstValue, nonce, deadline)
      const secondSig = await createPermitSignature(owner, spender, secondValue, nonce, deadline)

      // Use a mismatching signature
      await assertRevert(hny.permit(owner, spender, firstValue, deadline, secondSig.v, secondSig.r, secondSig.s), 'HNY:INVALID_SIGNATURE')
    })

    it('cannot use expired permit', async () => {
      const value = tokenAmount(100)
      const nonce = await hny.nonces(owner)

      // Use a prior deadline
      const now = bn((await web3.eth.getBlock('latest')).timestamp)
      const deadline = now.sub(bn(60))

      const { r, s, v } = await createPermitSignature(owner, spender, value, nonce, deadline)
      await assertRevert(hny.permit(owner, spender, value, deadline, v, r, s), 'HNY:AUTH_EXPIRED')
    })

    it('cannot use surpassed permit', async () => {
      const deadline = MAX_UINT256
      const nonce = await hny.nonces(owner)

      // Generate two signatures with the same nonce and use one
      const firstValue = tokenAmount(100)
      const secondValue = tokenAmount(500)
      const firstSig = await createPermitSignature(owner, spender, firstValue, nonce, deadline)
      const secondSig = await createPermitSignature(owner, spender, secondValue, nonce, deadline)

      // Using one should disallow the other
      await hny.permit(owner, spender, secondValue, deadline, secondSig.v, secondSig.r, secondSig.s)
      await assertRevert(hny.permit(owner, spender, firstValue, deadline, firstSig.v, firstSig.r, firstSig.s), 'HNY:INVALID_SIGNATURE')
    })
  })

  context('ERC-3009', () => {
    let from, fromPrivKey
    const to = newHolder

    async function createTransferWithAuthorizationSignature(from, to, value, validBefore, validAfter, nonce) {
      const digest = await createTransferWithAuthorizationDigest(hny, from, to, value, validBefore, validAfter, nonce)

      const { r, s, v } = ecsign(
        Buffer.from(digest.slice(2), 'hex'),
        Buffer.from(fromPrivKey.slice(2), 'hex')
      )

      return { r, s, v }
    }

    before(async () => {
      const wallet = web3.eth.accounts.create('erc3009')
      from = wallet.address
      fromPrivKey = wallet.privateKey
    })

    beforeEach(async () => {
      await hny.mint(from, tokenAmount(50), { from: issuer })
    })

    it('has the correct transferWithAuthorization typehash', async () => {
      assert.equal(await hny.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), TRANSFER_WITH_AUTHORIZATION_TYPEHASH, 'erc3009: typehash')
    })

    it('can transfer through transferWithAuthorization', async () => {
      const validAfter = 0
      const validBefore = MAX_UINT256

      const firstNonce = keccak256('first')
      const secondNonce = keccak256('second')
      assert.equal(await hny.authorizationState(from, firstNonce), false, 'erc3009: first auth unused')
      assert.equal(await hny.authorizationState(from, secondNonce), false, 'erc3009: second auth unused')

      const firstValue = tokenAmount(25)
      const firstSig = await createTransferWithAuthorizationSignature(from, to, firstValue, validAfter, validBefore, firstNonce)
      await itTransfersCorrectly(
        () => hny.transferWithAuthorization(from, to, firstValue, validAfter, validBefore, firstNonce, firstSig.v, firstSig.r, firstSig.s),
        { from, to, value: firstValue }
      )
      assert.equal(await hny.authorizationState(from, firstNonce), true, 'erc3009: first auth')

      const secondValue = tokenAmount(10)
      const secondSig = await createTransferWithAuthorizationSignature(from, to, secondValue, validAfter, validBefore, secondNonce)
      await itTransfersCorrectly(
        () => hny.transferWithAuthorization(from, to, secondValue, validAfter, validBefore, secondNonce, secondSig.v, secondSig.r, secondSig.s),
        { from, to, value: secondValue }
      )
      assert.equal(await hny.authorizationState(from, secondNonce), true, 'erc3009: second auth')
    })

    it('cannot transfer above balance', async () => {
      const value = (await hny.balanceOf(from)).add(bn('1'))
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, to, value, validAfter, validBefore, nonce)
      await assertRevert(
        hny.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s),
        'MATH:SUB_UNDERFLOW'
      )
    })

    it('cannot transfer to token', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, hny.address, value, validAfter, validBefore, nonce)
      await assertRevert(
        hny.transferWithAuthorization(from, hny.address, value, validAfter, validBefore, nonce, v, r, s),
        'HNY:RECEIVER_IS_TOKEN_OR_ZERO'
      )
    })

    it('cannot transfer to zero address', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, ZERO_ADDRESS, value, validAfter, validBefore, nonce)
      await assertRevert(
        hny.transferWithAuthorization(from, ZERO_ADDRESS, value, validAfter, validBefore, nonce, v, r, s),
        'HNY:RECEIVER_IS_TOKEN_OR_ZERO'
      )
    })

    it('cannot use wrong signature', async () => {
      const validAfter = 0
      const validBefore = MAX_UINT256

      const firstNonce = keccak256('first')
      const firstValue = tokenAmount(25)
      const firstSig = await createTransferWithAuthorizationSignature(from, to, firstValue, validAfter, validBefore, firstNonce)

      const secondNonce = keccak256('second')
      const secondValue = tokenAmount(10)
      const secondSig = await createTransferWithAuthorizationSignature(from, to, secondValue, validAfter, validBefore, secondNonce)

      // Use a mismatching signature
      await assertRevert(
        hny.transferWithAuthorization(from, to, firstValue, validAfter, validBefore, firstNonce, secondSig.v, secondSig.r, secondSig.s),
        'HNY:INVALID_SIGNATURE'
      )
    })

    it('cannot use before valid period', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')

      // Use a future period
      const now = bn((await web3.eth.getBlock('latest')).timestamp)
      const validAfter = now.add(bn(60))
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, to, value, validAfter, validBefore, nonce)
      await assertRevert(
        hny.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s),
        'HNY:AUTH_NOT_YET_VALID'
      )
    })

    it('cannot use after valid period', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')

      // Use a prior period
      const now = bn((await web3.eth.getBlock('latest')).timestamp)
      const validBefore = now.sub(bn(60))
      const validAfter = 0

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, to, value, validAfter, validBefore, nonce)
      await assertRevert(
        hny.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s),
        'HNY:AUTH_EXPIRED'
      )
    })

    it('cannot use expired nonce', async () => {
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const firstValue = tokenAmount(25)
      const secondValue = tokenAmount(10)
      const firstSig = await createTransferWithAuthorizationSignature(from, to, firstValue, validAfter, validBefore, nonce)
      const secondSig = await createTransferWithAuthorizationSignature(from, to, secondValue, validAfter, validBefore, nonce)

      // Using one should disallow the other
      await hny.transferWithAuthorization(from, to, firstValue, validAfter, validBefore, nonce, firstSig.v, firstSig.r, firstSig.s)
      await assertRevert(
        hny.transferWithAuthorization(from, to, secondValue, validAfter, validBefore, nonce, secondSig.v, secondSig.r, secondSig.s),
        'HNY:AUTH_ALREADY_USED'
      )
    })
  })
})
