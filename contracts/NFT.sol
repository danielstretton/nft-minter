// SPDX-License-Identifier: MIT

pragma solidity <0.9.0;

import "./Library.sol";

/**
 * @dev {ERC721} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *  - token ID and URI autogeneration
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and pauser
 * roles, as well as the default admin role, which will let it grant both minter
 * and pauser roles to other accounts.
 */
contract NFT is
    Context,
    AccessControlEnumerable,
    ERC721Enumerable,
    ERC721URIStorage
{
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIdTracker;

    string private _baseTokenURI;
    uint256 private _price;
    uint private _max;
    address private _admin;
    address private _admin2;

    uint256 public reflectionBalance;
    uint256 public totalDividend;
    mapping(uint256 => uint256) public lastDividendAt;
    mapping(uint256 => address) public minter;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        uint256 mintPrice,
        uint max,
        address admin,
        address admin2
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
        _price = mintPrice;
        _max = max;
        _admin = admin;
        _admin2 = admin2;

        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function getBaseURI() external view virtual returns (string memory) {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Avaxies: must have admin role to view token URI"
        );
        return _baseTokenURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Avaxies: must have admin role to change base URI"
        );
        _baseTokenURI = baseURI;
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Avaxies: must have admin role to change token URI"
        );
        _setTokenURI(tokenId, _tokenURI);
    }

    function setPrice(uint mintPrice) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Avaxies: must have admin role to change price"
        );
        _price = mintPrice;
    }

    function price() public view returns (uint) {
        return _price;
    }

    function mint(uint amount) public payable {
        require(
            msg.value == _price * amount,
            "Avaxies: must send correct price"
        );
        require(
            _tokenIdTracker.current() + amount <= _max,
            "Avaxies: not enough avaxies left to mint amount"
        );
        for (uint i = 0; i < amount; i++) {
            _mint(msg.sender, _tokenIdTracker.current());
            minter[_tokenIdTracker.current()] = msg.sender;
            lastDividendAt[_tokenIdTracker.current()] = totalDividend;
            _tokenIdTracker.increment();
            splitBalance(msg.value / amount);
        }
    }

    function tokenMinter(uint256 tokenId) public view returns (address) {
        return minter[tokenId];
    }

    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721URIStorage) {
        return ERC721URIStorage._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        if (totalSupply() > tokenId) claimReward(tokenId);
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AccessControlEnumerable, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function currentRate() public view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return reflectionBalance / totalSupply();
    }

    function claimRewards() public {
        uint count = balanceOf(msg.sender);
        uint256 balance = 0;
        for (uint i = 0; i < count; i++) {
            uint tokenId = tokenOfOwnerByIndex(msg.sender, i);
            balance += getReflectionBalance(tokenId);
            lastDividendAt[tokenId] = totalDividend;
        }
        payable(msg.sender).transfer(balance);
    }

    function getReflectionBalances() public view returns (uint256) {
        uint count = balanceOf(msg.sender);
        uint256 total = 0;
        for (uint i = 0; i < count; i++) {
            uint tokenId = tokenOfOwnerByIndex(msg.sender, i);
            total += getReflectionBalance(tokenId);
        }
        return total;
    }

    function claimReward(uint256 tokenId) public {
        require(
            ownerOf(tokenId) == _msgSender() ||
                getApproved(tokenId) == _msgSender(),
            "Avaxies: Only owner or approved can claim rewards"
        );
        uint256 balance = getReflectionBalance(tokenId);
        payable(ownerOf(tokenId)).transfer(balance);
        lastDividendAt[tokenId] = totalDividend;
    }

    function getReflectionBalance(
        uint256 tokenId
    ) public view returns (uint256) {
        return totalDividend - lastDividendAt[tokenId];
    }

    function splitBalance(uint256 amount) private {
        uint256 reflectionShare = amount / 10;
        uint256 mintingShare1 = ((amount - reflectionShare) * 3) / 4;
        uint256 mintingShare2 = (amount - reflectionShare) / 4;
        reflectDividend(reflectionShare);
        payable(_admin).transfer(mintingShare1);
        payable(_admin2).transfer(mintingShare2);
    }

    function reflectDividend(uint256 amount) private {
        reflectionBalance = reflectionBalance + amount;
        totalDividend = totalDividend + (amount / totalSupply());
    }

    function reflectToOwners() public payable {
        reflectDividend(msg.value);
    }
}
