pragma solidity ^0.5.17;

import '../token/IERC20.sol';
import './arbitrary-message-bridge/ForeignAmb.sol';

contract EthereumHoneyMigrator {

    IERC20 public honeyV2;
    ForeignAmb public foreignAmb;
    address public xdaiHoneyBurner;

    constructor(IERC20 _honeyV2, ForeignAmb _foreignAmb, address _xdaiHoneyBurner) public {
        honeyV2 = _honeyV2;
        foreignAmb = _foreignAmb;
        xdaiHoneyBurner = _xdaiHoneyBurner;
    }

    function sendHoneyV2(address _receiver, uint256 _amount) public {
        require(msg.sender == address(foreignAmb), "ERROR: Invalid sender");
        require(foreignAmb.messageSender() == xdaiHoneyBurner, "ERROR: Invalid xdai sender");
        require(honeyV2.transfer(_receiver, _amount), "ERROR: Transfer failed");
    }
}
