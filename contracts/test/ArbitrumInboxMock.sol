pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumInbox.sol";

contract ArbitrumInboxMock is ArbitrumInbox {

    constructor(ArbitrumBridge _bridge) public {
        bridge = _bridge;
    }
}
