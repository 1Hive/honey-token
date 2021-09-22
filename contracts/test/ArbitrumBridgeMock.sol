pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumBridge.sol";

contract ArbitrumBridgeMock is ArbitrumBridge {

    constructor(ArbitrumOutbox _activeOutbox) public {
        activeOutbox = _activeOutbox;
    }
}
