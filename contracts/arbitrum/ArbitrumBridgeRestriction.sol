pragma solidity ^0.5.17;

import './interfaces/ArbitrumInbox.sol';
import './interfaces/ArbitrumOutbox.sol';

contract ArbitrumBridgeRestriction {

    address public constant NOT_CALLED_FROM_BRIDGE_ADDRESS = address(1);

    ArbitrumInbox public arbitrumInbox;

    event ArbitrumInboxUpdated(ArbitrumInbox arbitrumInbox);

    constructor(ArbitrumInbox _arbitrumInbox) public {
        arbitrumInbox = _arbitrumInbox;
    }

    function _updateArbitrumInbox(ArbitrumInbox _arbitrumInbox) internal {
        arbitrumInbox = _arbitrumInbox;
    }

    function _getL2toL1Sender() internal view returns (address) {
        ArbitrumOutbox arbitrumOutbox = ArbitrumOutbox(arbitrumInbox.bridge().activeOutbox());
        return address(arbitrumOutbox) == address(0) ? NOT_CALLED_FROM_BRIDGE_ADDRESS : arbitrumOutbox.l2ToL1Sender();
    }
}
