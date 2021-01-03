const { expectRevert } = require('@openzeppelin/test-helpers');
const HLDToken = artifacts.require('HLDToken');
const HaloBazaar = artifacts.require('HaloBazaar');

contract('HaloBazaar', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.hld = await HLDToken.new({ from: alice });
        this.bazaar = await HaloBazaar.new(this.hld.address, { from: alice });
        this.hld.mint(alice, '100', { from: alice });
        this.hld.mint(bob, '100', { from: alice });
        this.hld.mint(carol, '100', { from: alice });
    });

    it('should not allow enter if not enough approve', async () => {
        await expectRevert(
            this.bazaar.enter('100', { from: alice }),
            'ERC20: transfer amount exceeds allowance',
        );
        await this.hld.approve(this.bazaar.address, '50', { from: alice });
        await expectRevert(
            this.bazaar.enter('100', { from: alice }),
            'ERC20: transfer amount exceeds allowance',
        );
        await this.hld.approve(this.bazaar.address, '100', { from: alice });
        await this.bazaar.enter('100', { from: alice });
        assert.equal((await this.bazaar.balanceOf(alice)).valueOf(), '100');
    });

    it('should not allow withraw more than what you have', async () => {
        await this.hld.approve(this.bazaar.address, '100', { from: alice });
        await this.bazaar.enter('100', { from: alice });
        await expectRevert(
            this.bazaar.leave('200', { from: alice }),
            'ERC20: burn amount exceeds balance',
        );
    });

    it('should work with more than one participant', async () => {
        await this.hld.approve(this.bazaar.address, '100', { from: alice });
        await this.hld.approve(this.bazaar.address, '100', { from: bob });
        // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
        await this.bazaar.enter('20', { from: alice });
        await this.bazaar.enter('10', { from: bob });
        assert.equal((await this.bazaar.balanceOf(alice)).valueOf(), '20');
        assert.equal((await this.bazaar.balanceOf(bob)).valueOf(), '10');
        assert.equal((await this.hld.balanceOf(this.bazaar.address)).valueOf(), '30');
        // HaloBazaar get 20 more SUSHIs from an external source.
        await this.hld.transfer(this.bazaar.address, '20', { from: carol });
        // Alice deposits 10 more SUSHIs. She should receive 10*30/50 = 6 shares.
        await this.bazaar.enter('10', { from: alice });
        assert.equal((await this.bazaar.balanceOf(alice)).valueOf(), '26');
        assert.equal((await this.bazaar.balanceOf(bob)).valueOf(), '10');
        // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
        await this.bazaar.leave('5', { from: bob });
        assert.equal((await this.bazaar.balanceOf(alice)).valueOf(), '26');
        assert.equal((await this.bazaar.balanceOf(bob)).valueOf(), '5');
        assert.equal((await this.hld.balanceOf(this.bazaar.address)).valueOf(), '52');
        assert.equal((await this.hld.balanceOf(alice)).valueOf(), '70');
        assert.equal((await this.hld.balanceOf(bob)).valueOf(), '98');
    });
});
