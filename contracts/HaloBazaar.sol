pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// The Bazaar is the supply market. 
//
// This contract handles swapping to and from xHld, HaloDeFi's staking token.
contract HaloBazaar is ERC20("HaloBazaar", "xHLD"){
    using SafeMath for uint256;
    IERC20 public hld;

    // Define the Hld token contract
    constructor(IERC20 _hld) public {
        hld = _hld;
    }

    // Enter the Bazaar. Pay some HLDs. Earn some shares.
    // Locks HLD and mints xHLD
    function enter(uint256 _amount) public {
        // Gets the amount of HLD locked in the contract
        uint256 totalHld = hld.balanceOf(address(this));
        // Gets the amount of xHLD in existence
        uint256 totalShares = totalSupply();
        // If no xHld exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalHld == 0) {
            _mint(msg.sender, _amount);
        } 
        // Calculate and mint the amount of xHld the HLD is worth. 
        // The ratio will change overtime, as xHLD is burned/minted and 
        // HLD deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount.mul(totalShares).div(totalHld);
            _mint(msg.sender, what);
        }
        // Lock the HLD in the contract
        hld.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the Bazaar. Claim back your HLD.
    // Unclocks the staked + gained HLD and burns xHLD
    function leave(uint256 _share) public {
        // Gets the amount of xHLD in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of Hld the xHLD is worth
        uint256 what = _share.mul(hld.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        hld.transfer(msg.sender, what);
    }
}