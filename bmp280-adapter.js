'use strict';

const { Adapter, Device, Property } = require('gateway-addon');
const BME280 = require('bme280-sensor');

const DEFAULT_OPTIONS = {
	i2cBusNo: 0,
	i2cAddress: BME280.BME280_DEFAULT_I2C_ADDRESS() // defaults to 0x77
};

class BMP280Device extends Device {
	constructor(adapter, id, deviceDescription) {
		console.log(`Creating device with id ${id}`, deviceDescription);
		super(adapter, id);
		this.title = deviceDescription.title;
		this.description = deviceDescription.description;
		this['@type'] = ['MultiLevelSensor'];

		//describe temperature
		const temperatureProperty = new Property(
			this,
			'temperature',
			{
				'@type': 'NumberProperty',
				type: 'number',
				unit: '°C',
				minimum: -273.15,
				description: 'Temperature in degrees Celsius (°C)',
				readOnly: true,
			}
		);
		this.properties.set('temperature', temperatureProperty);

		//describe pressure
		const pressureProperty = new Property(
			this,
			'pressure',
			{
				'@type': 'NumberProperty',
				type: 'number',
				unit: 'hPa',
				minimum: 0,
				description: 'Pressure in hectopascal (hPa)',
				readOnly: true,
			}
		);
		this.properties.set('pressure', pressureProperty);

		//create underlying sensor
		this.scanInterval = deviceDescription.scanInterval * 1000;
		this.sensorConfig = Object.assign({}, DEFAULT_OPTIONS);
		if(deviceDescription['i2cBusNo']) {
			this.sensorConfig.i2cBusNo = parseInt(deviceDescription['i2cBusNo']);
		}
		if(deviceDescription['i2cAddress']) {
			this.sensorConfig.i2cAddress = parseInt(deviceDescription['i2cAddress']);
		}
		this.sensor = new BME280(this.sensorConfig);
		console.log('Link with sensor setup successfully', this.sensorConfig);
	}

	readSensorData() {
		if(!this.busy) {
			this.busy = true;
			this.sensor.readSensorData().then(data => {
				this.busy = false;
				//update temperature
				const temperature = this.properties.get('temperature');
				//do not call setCachedValueAndNotify because device must be notified even if the value does not change
				temperature.setCachedValue(data.temperature_C);
				this.notifyPropertyChanged(temperature);

				//update pressure
				const pressure = this.properties.get('pressure');
				//same here
				pressure.setCachedValue(data.pressure_hPa);
				this.notifyPropertyChanged(pressure);
			}).catch(error => {
				console.log(`Unable to read sensor data: ${error}`);
			});
		}
	}

	start() {
		return this.sensor.init().then(() => {
			this.interval = setInterval(this.readSensorData.bind(this), this.scanInterval);
		});
	}

	stop() {
		clearInterval(this.interval);
	}
}

class BMP280Adapter extends Adapter {
	constructor(addonManager, manifest) {
		super(addonManager, 'BMP280Adapter', manifest.name);
		addonManager.addAdapter(this);
	}

	addDevice(deviceId, deviceDescription) {
		return new Promise((resolve, reject) => {
			if(deviceId in this.devices) {
				reject(`Device: ${deviceId} already exists`);
			}
			else {
				console.log(`Adding device with id ${deviceId}`);
				const device = new BMP280Device(this, deviceId, deviceDescription);
				device.start().then(() => {
					this.handleDeviceAdded(device);
					resolve(device);
				});
			}
		});
	}

	removeDevice(deviceId) {
		return new Promise((resolve, reject) => {
			const device = this.devices[deviceId];
			if(device) {
				console.log(`Removing device with id ${deviceId}`);
				device.stop();
				this.handleDeviceRemoved(device);
				resolve(device);
			} else {
				reject(`Device: ${deviceId} not found`);
			}
		});
	}
}

module.exports = function (addonManager, manifest) {
	console.log('Loading BMP280 adapter');
	const adapter = new BMP280Adapter(addonManager, manifest.name);
	manifest.moziot.config.sensors.forEach((sensor, index) => {
		const config = Object.assign({}, sensor);
		config.scanInterval = manifest.moziot.config.scanInterval;
		adapter.addDevice(`bmp280-${index}`, config);
	});
	console.log(`Adapter loaded with ${manifest.moziot.config.sensors.length} sample device(s)`);
};
