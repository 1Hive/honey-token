pragma solidity ^0.5.17;

import '../../token/IERC20.sol';
import '../../token/SafeMath.sol';

contract XdaiHoneyMigrator {

    using SafeMath for uint256;

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IERC20 public honeyV1;
    IERC20 public honeyV2;
    uint256 public multiplier;

    event HoneyMigrated(address from, address to, uint256 amountBurnt, uint256 amountGranted);

    constructor(IERC20 _honeyV1, IERC20 _honeyV2, uint256 _multiplier) public {
        honeyV1 = _honeyV1;
        honeyV2 = _honeyV2;
        multiplier = _multiplier;
    }

    function migrateHoneyV1ToHoneyV2(address _receivingAddress) public {
        uint256 honeyV1Balance = honeyV1.balanceOf(msg.sender);
        require(honeyV1Balance > 0, "MIGRATOR: No HoneyV1");
        uint256 honeyV2Balance = honeyV1Balance.mul(multiplier);

        require(honeyV1.transferFrom(msg.sender, BURN_ADDRESS, honeyV1Balance), "MIGRATOR: Transfer from failed");
        require(honeyV2.transfer(msg.sender, honeyV2Balance), "MIGRATOR: Transfer failed");

        emit HoneyMigrated(msg.sender, _receivingAddress, honeyV1Balance, honeyV2Balance);
    }
}
