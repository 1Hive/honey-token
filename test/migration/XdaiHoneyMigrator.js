const { assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { assertRevert } = require("../helpers/assertThrow");
const { bn, bigExp } = require('@aragon/contract-helpers-test')

const XdaiHoneyMigrator = artifacts.require("XdaiHoneyMigrator")
const Token = artifacts.require("TokenMock")

contract('XdaiHoneyMigrator', ([user, bridgedHoney]) => {

  let honeyv1, honeyv2, xdaiHoneyMigrator

  const tokenTotalSupply = bigExp(30000, 18)
  const multiplier = bn(1000)
  const honeyV2TotalSupply = tokenTotalSupply.mul(multiplier)

  beforeEach(async () => {
    honeyv1 = await Token.new(user, tokenTotalSupply)
    honeyv2 = await Token.new(bridgedHoney, honeyV2TotalSupply) // We don't need to use the actual Honey token as this will be a bridged token
    xdaiHoneyMigrator = await XdaiHoneyMigrator.new(honeyv1.address, honeyv2.address, multiplier)
  })

  it('sets correct constructor params', async() => {
    assert.equal(await xdaiHoneyMigrator.honeyV1(), honeyv1.address)
    assert.equal(await xdaiHoneyMigrator.honeyV2(), honeyv2.address)
    assertBn(await xdaiHoneyMigrator.multiplier(), multiplier)
  })

  context.only('migrateHoneyV1ToHoneyV2()', () => {
    it('burns honeyv1 and returns correct honeyv2', async () => {
      await honeyv2.transfer(xdaiHoneyMigrator.address, honeyV2TotalSupply, {from: bridgedHoney})
      const honeyV1BalanceBefore = await honeyv1.balanceOf(user)
      const honeyV2BalanceBefore = await honeyv2.balanceOf(user)
      const honeyV2MigratorBalanceBefore = await honeyv2.balanceOf(xdaiHoneyMigrator.address)

      xdaiHoneyMigrator.migrateHoneyV1ToHoneyV2(user, {from: user})

      const honeyV1BalanceAfter = await honeyv1.balanceOf(user)
      const honeyV2BalanceAfter = await honeyv2.balanceOf(user)
      const honeyV2MigratorBalanceAfter = await honeyv2.balanceOf(xdaiHoneyMigrator.address)
      assertBn(honeyV1BalanceAfter, bn(0))
      assertBn(honeyV2BalanceAfter, bn(honeyV2TotalSupply))
      assertBn(honeyV2MigratorBalanceAfter, bn(0))
    })
  })
})
