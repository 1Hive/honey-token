pragma solidity ^0.5.17;

import '../../token/IERC20.sol';
import './arbitrary-message-bridge/HomeAmb.sol';

contract XdaiHoneySender {

    uint256 public constant MAX_CALL_GAS = 300000;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IERC20 public honeyV1;
    HomeAmb public homeAmb;
    address public ethereumHoneyMigrator;

    event HoneyMigrated(address from, address to, uint256 amount);

    constructor(IERC20 _honeyV1, HomeAmb _homeAmb, address _ethereumHoneyMigrator) public {
        honeyV1 = _honeyV1;
        homeAmb = _homeAmb;
        ethereumHoneyMigrator = _ethereumHoneyMigrator;
    }

    function migrateHoneyV1ToHoneyV2(address _receivingAddress) public {
        uint256 honeyBalance = honeyV1.balanceOf(msg.sender);
        require(honeyV1.transferFrom(msg.sender, BURN_ADDRESS, honeyBalance), "ERROR: Transfer failed");

        bytes memory data = abi.encodeWithSignature('sendHoneyV2(address,uint256)', _receivingAddress, honeyBalance);
        homeAmb.requireToConfirmMessage(ethereumHoneyMigrator, data, MAX_CALL_GAS);

        emit HoneyMigrated(msg.sender, _receivingAddress, honeyBalance);
    }
}
