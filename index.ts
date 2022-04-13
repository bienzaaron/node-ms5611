import * as i2c from "i2c-bus";

const sleep = async (ms: number) => await new Promise((r) => setTimeout(r, ms));

const TEMP_PROM_START = 0xa0;

const READ_PRESSURE = 0x48;
const READ_TEMP = 0x58;

// see datasheet: https://www.te.com/commerce/DocumentDelivery/DDEController?Action=showdoc&DocId=Data+Sheet%7FMS5611-01BA03%7FB3%7Fpdf%7FEnglish%7FENG_DS_MS5611-01BA03_B3.pdf%7FCAT-BLPS0036
const calculateTempAndPressure = ({
  d1,
  d2,
  c,
}: {
  d1: number;
  d2: number;
  c: number[];
}) => {
  /* first order pressure and temp value calculation */
  const dT = d2 - c[5] * 2 ** 8;
  let temp = 2000 + (dT * c[6]) / 2 ** 23;
  let off = c[2] * 2 ** 16 + (c[4] * dT) / 2 ** 7;
  let sens = c[1] * 2 ** 15 + (c[3] * dT) / 2 ** 8;

  /* second order pressure and temp value calculation */
  let t2 = 0,
    off2 = 0,
    sens2 = 0;
  if (temp < 20) {
    t2 = dT ** 2 / 2 ** 31;
    off2 = (5 * (temp - 2000) ** 2) / 2;
    sens2 = off2 / 2;
  }
  if (temp < -15) {
    off2 = off2 + 7 * (temp + 1500) ** 2;
    sens2 = sens2 + (11 * (temp + 1500) ** 2) / 2;
  }

  temp -= t2;
  off -= off2;
  sens -= sens2;

  temp /= 100;
  const pressure = ((d1 * sens) / 2 ** 21 - off) / 2 ** 15 / 100;

  return { temp, pressure };
};

export default async function ms5611(address: number, bus: number) {
  const i2c1 = await i2c.openPromisified(bus);

  const c = new Array<number>(7);
  for (let i = 1; i < 7; i++) {
    const reg = TEMP_PROM_START + i * 2;
    // for some reason readWord isn't working how I'd expect, so do some bit manipulation to read consecutive bytes
    c[i] =
      (await i2c1.readByte(address, reg)) |
      ((await i2c1.readByte(address, reg + 1)) << 8);
  }

  const readData = async () => {
    const result = Buffer.alloc(3);

    await i2c1.writeByte(address, READ_PRESSURE, READ_PRESSURE);
    await sleep(10);
    await i2c1.readI2cBlock(address, 0x0, 3, result);

    const d1 = result.readUintBE(0, 3);

    await i2c1.writeByte(address, READ_TEMP, READ_TEMP);
    await sleep(10);
    await i2c1.readI2cBlock(address, 0x0, 3, result);

    const d2 = result.readUintBE(0, 3);

    return { d1, d2 };
  };

  return {
    async getValues() {
      return calculateTempAndPressure({ c, ...(await readData()) });
    },
    async close() {
      await i2c1.close();
    },
  };
}
