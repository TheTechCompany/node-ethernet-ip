import net from 'net';
import { Controller } from '../controller';
import { EventEmitter } from 'events';
import { Tag } from '../tag';
import { Types } from '../enip/cip/data-types';

export class ControllerManager extends EventEmitter {
  controllers: ManagedController[];

  constructor() {
    super();
    this.controllers = [];
  } 

  //Add controller
  addController(ipAddress, slot = 0, rpi = 100, connected = true, retrySP = 3000, opts = {}) {
    const contLength = this.controllers.push(new ManagedController(ipAddress, slot, rpi, connected, retrySP, opts))
    return this.controllers[contLength - 1];
  }

  //Get All Values. Changing these Values
  getAllValues() {
    let allTags = {}
    this.controllers.forEach(controller => {
      let tags = {}
      controller.tags.forEach(tag => {
        if(tag.tag){
          tags[tag.tag.name] = tag.tag.value
        }
      })
      allTags[controller.ipAddress] = tags
    })
    return allTags
  }
}

export class ManagedController extends EventEmitter {

  reconnect: boolean;
  ipAddress: any;
  slot: number;
  opts: {};
  rpi: number;
  PLC: Controller | null;

  tags: {
    tagname: string,
    program: string | null | undefined,
    dataType: number,
    arrayDims: number,
    arraySize: number,
    tag: Tag | null
  }[];

  public connected: boolean;
  conncom: boolean;
  retryTimeSP: number;

  constructor(ipAddress, slot = 0, rpi = 100, connCom = true, retrySP = 3000, opts = {}) {
    super();
    this.reconnect = true;
    this.ipAddress = ipAddress;
    this.slot = slot;
    this.opts = opts;
    this.rpi = rpi;
    this.PLC = null;
    this.tags = [];
    this.connected = false;
    this.conncom = connCom
    this.retryTimeSP = retrySP;
  }

  async connect(scanSize?: number) {
    this.reconnect = true;
    this.PLC = new Controller(this.conncom, {maxScanSize: scanSize});
    this.PLC.rpi = this.rpi;

    const plc = await this.PLC.connect(this.ipAddress, this.slot)

    this.connected = true;
    this.emit('Connected');

    plc.scan_rate = this.rpi;

    this.tags.forEach(tag => {
      tag.tag = plc.newTag(tag.tagname, tag.program, true, tag.dataType, tag.arrayDims, tag.arraySize)
      this.addTagEvents(tag.tag)
    })

    plc.scan()
      .catch(e => { this.errorHandle(e) })

  }

  addTagEvents(tag) {
    tag.on('Changed', (chTag, prevValue) => {
      this.emit('TagChanged', tag, prevValue)
    })
    tag.on('Initialized', () => {
      this.emit('TagInit', tag)
    })
  }

  errorHandle(e) {
    this.emit('Error', e)

    if (e.message && (e.message.slice(0, 7) === 'TIMEOUT' || e.message.slice(0, 6) === 'SOCKET')) {

      this.connected = false;
      this.PLC?.destroy();
      this.emit('Disconnected');
      if (this.reconnect) { setTimeout(() => { this.connect() }, this.retryTimeSP) };
    }
  }

  addTag(tagname, program: string | null = null, dataType: Types = Types.BOOL, keepAlive: number = 0, arrayDims = 0, arraySize = 0x01) {
    let tag: Tag | null = null
    if (this.connected && this.PLC) {
      tag = this.PLC.newTag(tagname, program, true, dataType, keepAlive, arrayDims, arraySize);
      this.addTagEvents(tag)
    }
    this.tags.push({
      tagname: tagname,
      program: program,
      dataType,
      arrayDims: arrayDims,
      arraySize: arraySize,
      tag: tag
    })
    return tag
  }

  disconnect() {
    return new Promise<void>((resolve, reject) => {
      this.connected = false;
      this.reconnect = false;

      this.PLC?.disconnect().then(() => {
        this.emit('Disconnected');
        resolve();
      }).catch(() => {
        net.Socket.prototype.destroy.call(this.PLC);
        this.emit('Disconnected');
        resolve();
      })
    })
  }

}