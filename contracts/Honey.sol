pragma solidity 0.5.17;

import './token/IERC20.sol';
import './token/SafeMath.sol';
import './arbitrum/interfaces/ArbitrumCustomToken.sol';
import './arbitrum/interfaces/ArbitrumGatewayRouter.sol';
import './arbitrum/interfaces/ArbitrumCustomGateway.sol';


// Token copied from ANTv2: https://github.com/aragon/aragon-network-token/blob/master/packages/v2/contracts/ANTv2.sol
contract Honey is ArbitrumCustomToken, IERC20 {
    using SafeMath for uint256;

    // bytes32 private constant EIP712DOMAIN_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    bytes32 private constant EIP712DOMAIN_HASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;
    // bytes32 private constant NAME_HASH = keccak256("Honey")
    bytes32 private constant NAME_HASH = 0xb1fe574678f9d45a762912fb436b82a323258f5535fab3006593cf786f82ac07;
    // bytes32 private constant VERSION_HASH = keccak256("1")
    bytes32 private constant VERSION_HASH = 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6;

    // bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    // bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    //     keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = 0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267;

    string public constant name = "Honey";
    string public constant symbol = "HNY";
    uint8 public constant decimals = 18;

    address public issuer;
    address public gatewaySetter;
    ArbitrumGatewayRouter public gatewayRouter;
    ArbitrumCustomGateway public gateway;
    bool public shouldRegisterGateway;
    uint256 public recentRetryableTxId;
    uint256 public totalSupply;
    mapping (address => uint256) public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance;

    // ERC-2612, ERC-3009 state
    mapping (address => uint256) public nonces;
    mapping (address => mapping (bytes32 => bool)) public authorizationState;

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event ChangeIssuer(address indexed issuer);
    event ChangeGatewaySetter(address indexed gatewaySetter);
    event ChangeGatewayRouter(address indexed gatewayRouter);
    event ChangeGateway(address indexed gateway);
    event RegisterWithGateway(uint256 retryableTransactionId);
    event RegisterWithGatewayRouter(uint256 retryableTransactionId);

    modifier onlyIssuer {
        require(msg.sender == issuer, "HNY:NOT_ISSUER");
        _;
    }

    modifier onlyGatewaySetter {
        require(msg.sender == gatewaySetter, "HNY:NOT_GATEWAY_SETTER");
        _;
    }

    constructor(address _issuer, address _gatewaySetter, ArbitrumGatewayRouter _gatewayRouter, ArbitrumCustomGateway _gateway) public {
        _changeIssuer(_issuer);
        _changeGatewaySetter(_gatewaySetter);
        _changeGatewayRouter(_gatewayRouter);
        _changeGateway(_gateway);
    }

    function _validateSignedData(address signer, bytes32 encodeData, uint8 v, bytes32 r, bytes32 s) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                getDomainSeparator(),
                encodeData
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        // Explicitly disallow authorizations for address(0) as ecrecover returns address(0) on malformed messages
        require(recoveredAddress != address(0) && recoveredAddress == signer, "HNY:INVALID_SIGNATURE");
    }

    function _changeIssuer(address newIssuer) internal {
        issuer = newIssuer;
        emit ChangeIssuer(newIssuer);
    }

    function _changeGatewaySetter(address newGatewaySetter) internal {
        gatewaySetter = newGatewaySetter;
        emit ChangeGatewaySetter(newGatewaySetter);
    }

    function _changeGatewayRouter(ArbitrumGatewayRouter newGatewayRouter) internal {
        gatewayRouter = newGatewayRouter;
        emit ChangeGatewayRouter(address(newGatewayRouter));
    }

    function _changeGateway(ArbitrumCustomGateway newGateway) internal {
        gateway = newGateway;
        emit ChangeGateway(address(newGateway));
    }

    function _mint(address to, uint256 value) internal {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint value) internal {
        // Balance is implicitly checked with SafeMath's underflow protection
        balanceOf[from] = balanceOf[from].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint256 value) private {
        require(to != address(this) && to != address(0), "HNY:RECEIVER_IS_TOKEN_OR_ZERO");

        // Balance is implicitly checked with SafeMath's underflow protection
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(from, to, value);
    }

    function getChainId() public pure returns (uint256 chainId) {
        assembly { chainId := chainid() }
    }

    function getDomainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712DOMAIN_HASH,
                NAME_HASH,
                VERSION_HASH,
                getChainId(),
                address(this)
            )
        );
    }

    function changeIssuer(address newIssuer) external onlyIssuer {
        _changeIssuer(newIssuer);
    }

    function changeGatewaySetter(address newGatewaySetter) external onlyGatewaySetter {
        _changeGatewaySetter(newGatewaySetter);
    }

    function changeGatewayRouter(ArbitrumGatewayRouter newGatewayRouter) external onlyGatewaySetter {
        _changeGatewayRouter(newGatewayRouter);
    }

    function changeGateway(ArbitrumCustomGateway newGateway) external onlyGatewaySetter {
        _changeGateway(newGateway);
    }

    function mint(address to, uint256 value) external onlyIssuer returns (bool) {
        _mint(to, value);
        return true;
    }

    function burn(address from, uint256 value) external onlyIssuer returns (bool) {
        _burn(from, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 fromAllowance = allowance[from][msg.sender];
        if (fromAllowance != uint256(-1)) {
            // Allowance is implicitly checked with SafeMath's underflow protection
            allowance[from][msg.sender] = fromAllowance.sub(value);
        }
        _transfer(from, to, value);
        return true;
    }

    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, "HNY:AUTH_EXPIRED");

        bytes32 encodeData = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline));
        _validateSignedData(owner, encodeData, v, r, s);

        _approve(owner, spender, value);
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
    external
    {
        require(block.timestamp > validAfter, "HNY:AUTH_NOT_YET_VALID");
        require(block.timestamp < validBefore, "HNY:AUTH_EXPIRED");
        require(!authorizationState[from][nonce],  "HNY:AUTH_ALREADY_USED");

        bytes32 encodeData = keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce));
        _validateSignedData(from, encodeData, v, r, s);

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
    * @dev Only callable during registerTokenOnL2() function. Should return `0xa4b1` if token is enabled for arbitrum gateways
    */
    function isArbitrumEnabled() external view returns (uint8) {
        require(shouldRegisterGateway, "HNY:NOT_EXPECTED_CALL");
        return uint8(0xa4b1);
    }

    function registerTokenOnL2(
        address _l2CustomTokenAddress,
        uint256 _maxSubmissionCost,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        address _creditBackAddress
    ) external onlyGatewaySetter {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        recentRetryableTxId = gateway.registerTokenToL2(_l2CustomTokenAddress, _maxSubmissionCost, _maxGas, _gasPriceBid, _creditBackAddress);

        shouldRegisterGateway = prev;
        emit RegisterWithGateway(recentRetryableTxId);
    }

    // TODO: Should this be restricted?
    function registerWithGatewayRouter(uint256 _maxGas, uint256 _gasPriceBid, uint256 _maxSubmissionCost) external {
        recentRetryableTxId = gatewayRouter.setGateway(gateway, _maxGas, _gasPriceBid, _maxSubmissionCost);
        emit RegisterWithGatewayRouter(recentRetryableTxId);
    }
}
