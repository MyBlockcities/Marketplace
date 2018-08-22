pragma solidity ^0.4.23;

import "contracts/Escrow.sol";

contract RealEstate {

	enum HouseCondition {New, Used}

	uint public houseIndex;

	address public arbiter;

	mapping (address => mapping(uint => House)) stores;
	mapping (uint => address) houseIdInStore;
	mapping (uint => address) houseEscrow;

	struct House {
		uint id;
		string name;
		string category;
		string imageLink;
		string descLink;
		uint startTime;
		uint price;
		HouseCondition condition;
		address buyer;
	}

	
	constructor(address _arbiter) public {
		houseIndex = 0;
		arbiter = _arbiter;
	}

	function addHouseToStore (string _name, string _category, string _imageLink,
        string _descLink, uint _startTime, uint _price, uint _houseCondition) public {

	 	houseIndex = houseIndex + 1; 
		House memory house  = House(houseIndex, _name, _category, _imageLink, 
			_descLink, _startTime, _price, HouseCondition(_houseCondition), 0);
		stores[msg.sender][houseIndex] = house;
		houseIdInStore[houseIndex] = msg.sender;
	}

	function getHouse (uint _houseId) public view returns (uint, string, string, string,
	 string, uint, uint, HouseCondition, address) {

		House memory house = stores[houseIdInStore[_houseId]][_houseId];
		return (house.id, house.name, house.category, house.imageLink, 
			house.descLink, house.startTime, house.price, 
			house.condition, house.buyer);
	}

	function buy(uint _houseId) payable public {
		House memory house = stores[houseIdInStore[_houseId]][_houseId];
		require(house.buyer == address(0));
		require(msg.value >= house.price);
		house.buyer = msg.sender;
		stores[houseIdInStore[_houseId]][_houseId] = house;
		Escrow escrow = (new Escrow).value(msg.value)(_houseId, msg.sender, houseIdInStore[_houseId], arbiter);
		houseEscrow[_houseId] = escrow;
	}

	function escrowInfo(uint _houseId) view public returns (address, address, address, bool, uint, uint) {
		return Escrow(houseEscrow[_houseId]).escrowInfo();
	}

	function releaseAmountToSeller(uint _houseId) public {
		Escrow(houseEscrow[_houseId]).releaseAmountToSeller(msg.sender);
	}

	function refundAmountToBuyer(uint _houseId) public {
		Escrow(houseEscrow[_houseId]).refundAmountToBuyer(msg.sender);
	}
}
