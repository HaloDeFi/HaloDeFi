pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract HaloDepot {
    using SafeMath for uint256;
    event Enter(address indexed user, uint256 amount);
    event Leave(address indexed user, uint256 amount);

    IERC20 public hld;

    uint256 public reductionPerBlock;
    uint256 public multiplier;
    uint256 public lastMultiplerProcessBlock;

    uint256 public accHldPerShare;
    uint256 public ackHldBalance;
    uint256 public totalShares;

    struct UserInfo {
        uint256 amount; // Hld stake amount
        uint256 share;
        uint256 rewardDebt;
    }

    mapping (address => UserInfo) public userInfo;

    constructor(IERC20 _hld, uint256 _reductionPerBlock) public {
        hld = _hld;
        reductionPerBlock = _reductionPerBlock; // Use 999999390274979584 for 10% per month
        multiplier = 1e18; // Should be good for 20 years
        lastMultiplerProcessBlock = block.number;
    }

    // Clean the Depot. Called whenever someone enters or leaves.
    function cleanup() public {
        // Update multiplier
        uint256 reductionTimes = block.number.sub(lastMultiplerProcessBlock);
        uint256 fraction = 1e18;
        uint256 acc = reductionPerBlock;
        while (reductionTimes > 0) {
            if (reductionTimes & 1 != 0) {
                fraction = fraction.mul(acc).div(1e18);
            }
            acc = acc.mul(acc).div(1e18);
            reductionTimes = reductionTimes / 2;
        }
        multiplier = multiplier.mul(fraction).div(1e18);
        lastMultiplerProcessBlock = block.number;
        if (totalShares > 0) {
            uint256 additionalHld = hld.balanceOf(address(this)).sub(ackHldBalance);
            accHldPerShare = accHldPerShare.add(additionalHld.mul(1e12).div(totalShares));
            ackHldBalance = ackHldBalance.add(additionalHld);
        }
    }

    // Get user pending reward. May be outdated until someone calls cleanup.
    function getPendingReward(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        return user.share.mul(accHldPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Enter the Depot. Pay some Hlds. Earn some shares.
    function enter(uint256 _amount) public {
        cleanup();
        safeHldTransfer(msg.sender, getPendingReward(msg.sender));
        hld.transferFrom(msg.sender, address(this), _amount);
        ackHldBalance = ackHldBalance.add(_amount);
        UserInfo storage user = userInfo[msg.sender];
        uint256 moreShare = _amount.mul(multiplier).div(1e18);
        user.amount = user.amount.add(_amount);
        totalShares = totalShares.add(moreShare);
        user.share = user.share.add(moreShare);
        user.rewardDebt = user.share.mul(accHldPerShare).div(1e12);
        emit Enter(msg.sender, _amount);
    }

    // Leave the Depot. Claim back your Hlds.
    function leave(uint256 _amount) public {
        cleanup();
        safeHldTransfer(msg.sender, getPendingReward(msg.sender));
        UserInfo storage user = userInfo[msg.sender];
        uint256 lessShare = user.share.mul(_amount).div(user.amount);
        user.amount = user.amount.sub(_amount);
        totalShares = totalShares.sub(lessShare);
        user.share = user.share.sub(lessShare);
        user.rewardDebt = user.share.mul(accHldPerShare).div(1e12);
        safeHldTransfer(msg.sender, _amount);
        emit Leave(msg.sender, _amount);
    }

    // Safe Hld transfer function, just in case if rounding error causes pool to not have enough Hlds.
    function safeHldTransfer(address _to, uint256 _amount) internal {
        uint256 hldBal = hld.balanceOf(address(this));
        if (_amount > hldBal) {
            hld.transfer(_to, hldBal);
            ackHldBalance = ackHldBalance.sub(hldBal);
        } else {
            hld.transfer(_to, _amount);
            ackHldBalance = ackHldBalance.sub(_amount);
        }
    }
}