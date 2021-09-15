const { assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { assertRevert } = require("../helpers/assertThrow");
const { bn, bigExp } = require('@aragon/contract-helpers-test')

const XdaiHoneyMigrator = artifacts.require("XdaiHoneyMigrator")
const Token = artifacts.require("TokenMock")

contract('XdaiHoneyMigrator', ([user1, user2, bridgedHoney, unused]) => {

  let honeyv1, honeyv2, xdaiHoneyMigrator, burnAddress

  const honeyV1TotalSupply = bigExp(30000, 18)
  const multiplier = bn(1000)
  const honeyV2TotalSupply = honeyV1TotalSupply.mul(multiplier)

  beforeEach(async () => {
    honeyv1 = await Token.new(user1, honeyV1TotalSupply)
    honeyv2 = await Token.new(bridgedHoney, honeyV2TotalSupply) // We don't need to use the actual Honey token as this will be a bridged token
    xdaiHoneyMigrator = await XdaiHoneyMigrator.new(honeyv1.address, honeyv2.address, multiplier)
    burnAddress = await xdaiHoneyMigrator.BURN_ADDRESS()
  })

  it('sets correct constructor params', async () => {
    assert.equal(await xdaiHoneyMigrator.honeyV1(), honeyv1.address)
    assert.equal(await xdaiHoneyMigrator.honeyV2(), honeyv2.address)
    assertBn(await xdaiHoneyMigrator.multiplier(), multiplier)
  })

  context.only('migrateHoneyV1ToHoneyV2()', () => {
    it('burns honeyv1 and returns correct honeyv2', async () => {
      await honeyv2.transfer(xdaiHoneyMigrator.address, honeyV2TotalSupply, {from: bridgedHoney})
      await honeyv1.approve(xdaiHoneyMigrator.address, honeyV1TotalSupply, {from: user1})

      await xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user1, {from: user1})

      assertBn(await honeyv1.balanceOf(user1), bn(0))
      assertBn(await honeyv1.balanceOf(burnAddress), bn(honeyV1TotalSupply))
      assertBn(await honeyv2.balanceOf(user1), bn(honeyV2TotalSupply))
      assertBn(await honeyv2.balanceOf(xdaiHoneyMigrator.address), bn(0))
    })

    it.only('burns and returns correct honey for multiple accounts', async () => {
      await honeyv2.transfer(xdaiHoneyMigrator.address, honeyV2TotalSupply, {from: bridgedHoney})
      const user2Balance = bigExp(10000, 18)
      const user1Balance = honeyV1TotalSupply.sub(user2Balance)
      await honeyv1.transfer(user2, user2Balance, {from: user1})

      await xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user1, {from: user1})

      assertBn(await honeyv1.balanceOf(user1), bn(0))
      assertBn(await honeyv1.balanceOf(burnAddress), user1Balance)
      assertBn(await honeyv2.balanceOf(user1), user1Balance.mul(multiplier))
      assertBn(await honeyv2.balanceOf(xdaiHoneyMigrator.address), user2Balance.mul(multiplier))

      await xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user2, {from: user2})

      assertBn(await honeyv1.balanceOf(user2), bn(0))
      assertBn(await honeyv1.balanceOf(burnAddress), honeyV1TotalSupply)
      assertBn(await honeyv2.balanceOf(user2), user2Balance.mul(multiplier))
      assertBn(await honeyv2.balanceOf(xdaiHoneyMigrator.address), bn(0))
    })

    it('returns honey to different account than sender', async () => {

    })

    it('reverts when user does not approve', async () => {
      await honeyv2.transfer(xdaiHoneyMigrator.address, honeyV2TotalSupply, {from: bridgedHoney})
      await assertRevert(xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user1, {from: user1}))
    })

    it('reverts when user has no funds', async () => {
      await honeyv2.transfer(xdaiHoneyMigrator.address, honeyV2TotalSupply, {from: bridgedHoney})
      await honeyv1.transfer(unused, honeyV1TotalSupply, {from: user1})
      await assertRevert(xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user1, {from: user1}), "MIGRATOR: No HoneyV1")
    })

    it('reverts when migrator has no funds', async () => {
      await assertRevert(xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user1, {from: user1}))
    })
  })
})
