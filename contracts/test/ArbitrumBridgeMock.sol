pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumBridge.sol";

contract ArbitrumBridgeMock is ArbitrumBridge {

    constructor(ArbitrumOutbox _activeOutbox) public {
        activeOutbox = _activeOutbox;
    }

    function executeCall(address destAddr, bytes calldata data) external {
        (bool success, bytes memory returndata) = destAddr.call(data);

        if (!success) {
            if (returndata.length > 0) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("BRIDGE_CALL_FAILED");
            }
        }
    }
}
