pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumOutbox.sol";

contract ArbitrumOutboxMock is ArbitrumOutbox {

    address public l2ToL1Sender;

    constructor(address _l2ToL1Sender) public {
        l2ToL1Sender = _l2ToL1Sender;
    }

    function setL2ToL1Sender(address _l2ToL1Sender) public {
        l2ToL1Sender = _l2ToL1Sender;
    }
}
