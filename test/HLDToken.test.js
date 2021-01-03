const { expectRevert } = require('@openzeppelin/test-helpers');
const HLDToken = artifacts.require('HLDToken');

contract('HLDToken', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.hld = await HLDToken.new({ from: alice });
    });

    it('should have correct name and symbol and decimal', async () => {
        const name = await this.hld.name();
        const symbol = await this.hld.symbol();
        const decimals = await this.hld.decimals();
        assert.equal(name.valueOf(), 'HLDToken');
        assert.equal(symbol.valueOf(), 'HLD');
        assert.equal(decimals.valueOf(), '18');
    });

    it('should only allow owner to mint token', async () => {
        await this.hld.mint(alice, '100', { from: alice });
        await this.hld.mint(bob, '1000', { from: alice });
        await expectRevert(
            this.hld.mint(carol, '1000', { from: bob }),
            'Ownable: caller is not the owner',
        );
        const totalSupply = await this.hld.totalSupply();
        const aliceBal = await this.hld.balanceOf(alice);
        const bobBal = await this.hld.balanceOf(bob);
        const carolBal = await this.hld.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '100');
        assert.equal(bobBal.valueOf(), '1000');
        assert.equal(carolBal.valueOf(), '0');
    });

    it('should supply token transfers properly', async () => {
        await this.hld.mint(alice, '100', { from: alice });
        await this.hld.mint(bob, '1000', { from: alice });
        await this.hld.transfer(carol, '10', { from: alice });
        await this.hld.transfer(carol, '100', { from: bob });
        const totalSupply = await this.hld.totalSupply();
        const aliceBal = await this.hld.balanceOf(alice);
        const bobBal = await this.hld.balanceOf(bob);
        const carolBal = await this.hld.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '90');
        assert.equal(bobBal.valueOf(), '900');
        assert.equal(carolBal.valueOf(), '110');
    });

    it('should fail if you try to do bad transfers', async () => {
        await this.hld.mint(alice, '100', { from: alice });
        await expectRevert(
            this.hld.transfer(carol, '110', { from: alice }),
            'ERC20: transfer amount exceeds balance',
        );
        await expectRevert(
            this.hld.transfer(carol, '1', { from: bob }),
            'ERC20: transfer amount exceeds balance',
        );
    });
  });
