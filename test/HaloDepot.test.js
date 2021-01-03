const { expectRevert, time } = require('@openzeppelin/test-helpers');
const HLDToken = artifacts.require('HLDToken');
const HaloBazaar = artifacts.require('HaloBazaar');

contract('HaloBazaar', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.hld = await HLDToken.new({ from: alice });
        // 10% reduction per 1000 blocks
        this.bazaar = await HaloBazaar.new(this.hld.address, '999894645034566400', { from: alice });
        this.hld.mint(alice, '1000', { from: alice });
        this.hld.mint(bob, '1000', { from: alice });
        this.hld.mint(carol, '1000', { from: alice });
    });

    it('should work properly', async () => {
        await this.hld.approve(this.bazaar.address, '1000', { from: alice });
        await this.hld.approve(this.bazaar.address, '1000', { from: bob });
        // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
        await this.bazaar.enter('200', { from: alice });
        await this.bazaar.enter('100', { from: bob });
        assert.equal((await this.bazaar.userInfo(alice)).amount.valueOf(), '200');
        assert.equal((await this.bazaar.userInfo(bob)).amount.valueOf(), '100');
        assert.equal((await this.bazaar.userInfo(alice)).share.valueOf(), '199');
        assert.equal((await this.bazaar.userInfo(bob)).share.valueOf(), '99');
        // SushiBar get 200 more HLDs from an external source.
        await this.hld.transfer(this.bazaar.address, '200', { from: carol });
        // Pending rewards should be correct
        await this.bazaar.cleanup();
        assert.equal((await this.bazaar.getPendingReward(alice)).valueOf(), '133');
        assert.equal((await this.bazaar.getPendingReward(bob)).valueOf(), '66');
        // Advance 1000 blocks.
        for (let i = 0; i < 1000; ++i) {
            await time.advanceBlock();
        }
        // Alice deposits 200 more HLDs. But it's worth 10% less
        await this.bazaar.enter('200', { from: alice });
        assert.equal((await this.hld.balanceOf(alice)).valueOf(), '733');
        assert.equal((await this.hld.balanceOf(bob)).valueOf(), '900');
        assert.equal((await this.bazaar.userInfo(alice)).amount.valueOf(), '400');
        assert.equal((await this.bazaar.userInfo(bob)).amount.valueOf(), '100');
        assert.equal((await this.bazaar.userInfo(alice)).share.valueOf(), '378');
        assert.equal((await this.bazaar.userInfo(bob)).share.valueOf(), '99');
        assert.equal((await this.bazaar.getPendingReward(alice)).valueOf(), '0');
        assert.equal((await this.bazaar.getPendingReward(bob)).valueOf(), '66');
        // SushiBar get 200 more HLDs from an external source.
        await this.hld.transfer(this.bazaar.address, '200', { from: carol });
        await this.bazaar.cleanup();
        assert.equal((await this.bazaar.getPendingReward(alice)).valueOf(), '159'); // 378/477*200
        assert.equal((await this.bazaar.getPendingReward(bob)).valueOf(), '107'); // 66+99/477*200
        // Alice withdraw half and Bob withdraw all.
        await this.bazaar.leave('200', { from: alice });
        await this.bazaar.leave('100', { from: bob });
        assert.equal((await this.hld.balanceOf(alice)).valueOf(), '1092');
        assert.equal((await this.hld.balanceOf(bob)).valueOf(), '1107');
        assert.equal((await this.bazaar.userInfo(alice)).amount.valueOf(), '200');
        assert.equal((await this.bazaar.userInfo(bob)).amount.valueOf(), '0');
        assert.equal((await this.bazaar.userInfo(alice)).share.valueOf(), '189');
        assert.equal((await this.bazaar.userInfo(bob)).share.valueOf(), '0');
        assert.equal((await this.bazaar.getPendingReward(alice)).valueOf(), '0');
        assert.equal((await this.bazaar.getPendingReward(bob)).valueOf(), '0');
    });
});
