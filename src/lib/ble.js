// Live heart rate from any Bluetooth device that uses the standard Heart Rate profile:
// chest straps (Polar H10, Garmin HRM, Wahoo TICKR), arm bands, and watches in "broadcast HR" mode.
export const bleSupported = () => typeof navigator !== 'undefined' && !!navigator.bluetooth

export async function connectHeartRate({ onBpm, onDisconnect }) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }], optionalServices: ['battery_service'] })
  device.addEventListener('gattserverdisconnected', () => onDisconnect?.())
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService('heart_rate')
  const characteristic = await service.getCharacteristic('heart_rate_measurement')
  characteristic.addEventListener('characteristicvaluechanged', (e) => {
    const v = e.target.value
    const flags = v.getUint8(0)
    const bpm = flags & 0x1 ? v.getUint16(1, true) : v.getUint8(1)
    if (bpm > 0) onBpm(bpm)
  })
  await characteristic.startNotifications()
  let battery = null
  try {
    const bs = await server.getPrimaryService('battery_service')
    const level = await (await bs.getCharacteristic('battery_level')).readValue()
    battery = level.getUint8(0)
  } catch {
    /* battery service is optional */
  }
  return {
    name: device.name || 'Heart rate monitor',
    battery,
    disconnect: () => {
      if (device.gatt.connected) device.gatt.disconnect()
    },
  }
}
