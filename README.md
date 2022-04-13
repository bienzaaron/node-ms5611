# node-ms5611

`node-ms5611` is a node module which makes it easy to interact with [MS5611 digtal pressure and temperature sensors](https://www.te.com/commerce/DocumentDelivery/DDEController?Action=showdoc&DocId=Data+Sheet%7FMS5611-01BA03%7FB3%7Fpdf%7FEnglish%7FENG_DS_MS5611-01BA03_B3.pdf%7FCAT-BLPS0036). It communicates with the sensor via i2c.

## Example Usage
```javascript
import ms5611 from 'ms5611';

const address = 0x77; // i2c address - use i2cdump to find this
const bus = 1;        // i2c bus

// start i2c communication
const { getValues, close } = await ms5611(address, bus);

// read temp and pressure
const { temp, pressure } = await getValues();
console.log(`temp in celsius: ${temp.toFixed(2)}`);
console.log(`pressure in millibar: ${pressure.toFixed(2)}`);

// clean up any resources associated with i2c bus
await close();
```

## Raspberry Pi Setup

To use this module with a raspberry pi, you'll need to do a few things first:
1. Enable the i2c bus using `raspi-config`
   1. Run `sudo raspi-config`
   2. Navigate to Interface Options > I2C > Yes
2. Connect the sensor to your pi
3. Determine the address for your sensor:
   1. Install i2c-tools: `sudo apt install i2c-tools`
   2. Run `sudo i2cdetect -y <bus>`, where bus is 1 or 0 depending on your pi model.
   The address of all i2c devices connected to your pi will be printed to stdout.
4. Run the example code above with the values for address and bus
