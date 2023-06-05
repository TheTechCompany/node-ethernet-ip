import {CIP} from "../enip";
const { MessageRouter } = CIP;
const { WRITE_TAG, WRITE_TAG_FRAGMENTED } = MessageRouter.services;
import {Tag} from "../tag";
import {Template} from "./template";
import { bufferToString, stringToBuffer } from "../utilities";
import equals from "deep-equal";

export class Structure extends Tag {
    _valueObj: string | {[key: string]: any} | null;
    _taglist: any;
    _template: any;
    state: any;

    constructor (tagname, taglist, program : string | null = null, datatype : number, keepAlive = 0, arrayDims = 0, arraySize = 0x01) {
        super(tagname, program, datatype, keepAlive, arrayDims, arraySize);
        this._valueObj = null;
        this._taglist = taglist;
        this._template = taglist.getTemplateByTag(tagname, program);
        if (this._template) super.type = CIP.DataTypes.Types.STRUCT;
    }

    get value () {
        if (!this._template) {
            return super.value;
        } else {
            if (super.value) {
                if (this._valueObj) {
                    return this._valueObj
                } else {
                    this._valueObj = this.parseValue(super.value);
                    return this._valueObj
                }               
            } else {
                return null;
            }
        }
    }

    parseValue (data) {
        if (this.state.tag.arrayDims > 0) {
            return this._parseReadDataArray(data)
        } else {
            return this._parseReadData(data, this._template);
        }
        
    }

    set value (newValue) {
        if (!this._template) {
            super.value = newValue;
        } else {
            if (this.state.tag.arrayDims > 0) {
                super.value = this._parseWriteDataArray(newValue);
                this._valueObj = this.parseValue(super.value);
            } else {
                super.value = this._parseWriteData (newValue, this._template);
                this._valueObj = this.parseValue(super.value);
            }
        }
    }

    writeObjToValue() {
        if (this.state.tag.arrayDims > 0) {
            super.value = this._parseWriteDataArray(this._valueObj);
        } else {
            super.value = this._parseWriteData (this._valueObj, this._template);
        }             
    }

    generateWriteMessageRequest(value = null, size = 0x01) {
        const { STRUCT } = CIP.DataTypes.Types;
        
        if(!this._template) {
            return super.generateReadMessageRequest(value, size);
        } else {
            const { tag } = this.state;
            const buf = Buffer.alloc(6);
            buf.writeUInt16LE(STRUCT, 0);
            buf.writeUInt16LE(this._template._attributes.StructureHandle, 2);
            if (Array.isArray(this.value)) {
                buf.writeUInt16LE(this.value.length, 4);
            } else {
                buf.writeUInt16LE(size, 4);
            }        
            
            return MessageRouter.build(WRITE_TAG, tag.path, Buffer.concat([buf, super.value as any]));  
        }
    }

    generateWriteMessageRequestFrag(offset = 0, value = null, size = 0x01) {
        const { STRUCT } = CIP.DataTypes.Types;

        if(!this._template) {
            return super.generateWriteMessageRequest(value, size);
        } else {
            const { tag } = this.state;
            const buf = Buffer.alloc(10);
            buf.writeUInt16LE(STRUCT, 0);
            buf.writeUInt16LE(this._template._attributes.StructureHandle, 2);
            if (Array.isArray(this.value)) {
                buf.writeUInt16LE(this.value.length, 4);
            } else {
                buf.writeUInt16LE(size, 4);
            }
            buf.writeUInt32LE(offset, 6);

            return MessageRouter.build(WRITE_TAG_FRAGMENTED, tag.path, Buffer.concat([buf, value as any]));  
        }
    }

    _parseReadData (data, template) : {[key: string]: any} | string {
        if (template._members.length === 2 && template._members[0].name === "LEN" && template._members[1].name === "DATA")
            return bufferToString(data);

        let structValues = {};
        
        const {SINT, INT, DINT, REAL, LINT, BIT_STRING, BOOL, STRUCT } = CIP.DataTypes.Types;

        template._members.forEach(member => {
            
            /* eslint-disable indent */
            switch (member.type.structure ? STRUCT : member.type.code) {
                case SINT:
                    if (member.type.arrayDims > 0) {
                        structValues[member.name] = [];
                        for (let i = 0; i < member.info; i++) {
                            structValues[member.name].push(data.readUInt8(member.offset + i));
                        }
                    } else {
                        structValues[member.name] = data.readUInt8(member.offset);
                    } 
                    break;
                case INT:
                    if (member.type.arrayDims > 0) {
                        let array : number[] = [];
                        for (let i = 0; i < member.info * 2; i+=2) {
                            array.push(data.readInt16LE(member.offset + i));
                        }
                        structValues[member.name] = array;
                    } else {
                        structValues[member.name] = data.readInt16LE(member.offset);
                    }
                    break;
                case DINT:
                    if (member.type.arrayDims > 0) {
                        let array : number[] = [];
                        for (let i = 0; i < member.info * 4; i+=4) {
                            array.push(data.readInt32LE(member.offset + i));
                        }
                        structValues[member.name] = array;
                    } else {
                        structValues[member.name] = data.readInt32LE(member.offset);
                    }
                    break;
                case REAL:
                    if (member.type.arrayDims > 0) {
                        let array : number[] = [];
                        for (let i = 0; i < member.info * 4; i+=4) {
                            array.push(data.readFloatLE(member.offset + i));
                        }
                        structValues[member.name] = array;
                    } else {
                        structValues[member.name] = data.readFloatLE(member.offset);
                    }
                    break;
                case LINT:
                    if (member.type.arrayDims > 0) {
                        let array : number[] = [];
                        for (let i = 0; i < member.info * 8; i+=8) {
                            array.push(data.readBigInt64LE(member.offset + i));
                        }
                        structValues[member.name] = array;
                    } else {
                        structValues[member.name] = data.readBigInt64LE(member.offset);
                    }
                    break;
                case BIT_STRING:
                    if (member.type.arrayDims > 0) {
                        let array : boolean[] = [];
                        for (let i = 0; i < member.info * 4; i+=4) {
                            let bitString32bitValue = data.readUInt32LE(member.offset + i);
                            for (let j = 0; j < 32; j++) {
                                array.push(!!(bitString32bitValue >> j & 0x01));
                            }
                        }
                        structValues[member.name] = array;
                    } else {
                        structValues[member.name] = data.readUInt32LE(member.offset);
                    }
                    break;
                case BOOL:
                    structValues[member.name] = !!(data.readUInt8(member.offset) & (1 << member.info));
                    break;
                case STRUCT: {
                    const memberTemplate = this._taglist.templates[member.type.code];
                    const memberStructSize = memberTemplate._attributes.StructureSize;
                    if (member.type.arrayDims > 0) { 
                        let array : (string | {[key: string]: any})[] = [];
                        for (let i = 0; i < member.info * memberStructSize; i+=memberStructSize) {
                            array.push(this._parseReadData(data.slice(member.offset + i), memberTemplate));
                        }
                        structValues[member.name] = array;
                    } else {
                        structValues[member.name] = this._parseReadData(data.slice(member.offset), memberTemplate);
                    }
                    break;
                }
                default:
                    throw new Error(
                        "Data Type other than SINT, INT, DINT, LINT, BOOL, STRUCT or BIT_STRING returned "
                    );
            }
            /* eslint-enable indent */   
        });
        return structValues;
    }

    _parseReadDataArray(data) {
        let array : string | {[key: string]: any} = [];
        for (let i = 0; i < data.length; i+=this._template._attributes.StructureSize) {
            array.push(this._parseReadData(data.slice(i),this._template))
        }
        return array
    }

    _parseWriteData (structValues, template) {
        if (template._members.length === 2 && template._members[0].name === "LEN" && template._members[1].name === "DATA")
            return stringToBuffer(structValues, template._attributes.StructureSize);

        const data = Buffer.alloc(template._attributes.StructureSize);

        const {SINT, INT, DINT, REAL, LINT, BIT_STRING, BOOL, STRUCT } = CIP.DataTypes.Types;
        
        template._members.forEach(member => {
            /* eslint-disable indent */
            switch (member.type.structure ? STRUCT : member.type.code) {
                case SINT:
                    if (member.type.arrayDims > 0) {
                        for (let i = 0; i < member.info; i++) {
                            data.writeUInt8(structValues[member.name][i], member.offset + i);
                        }
                    } else {
                        data.writeUInt8(structValues[member.name], member.offset);
                    } 
                    break;
                case INT:
                    if (member.type.arrayDims > 0) {
                        for (let i = 0; i < member.info; i++) {
                            data.writeInt16LE(structValues[member.name][i], member.offset + (i * 2));
                        }
                    } else {
                        data.writeInt16LE(structValues[member.name],member.offset);
                    }
                    break;
                case DINT:
                    if (member.type.arrayDims > 0) {
                        for (let i = 0; i < member.info; i++) {
                            data.writeInt32LE(structValues[member.name][i], member.offset + (i * 4));
                        }
                    } else {
                        data.writeInt32LE(structValues[member.name],member.offset);
                    }
                    break;
                case REAL:
                    if (member.type.arrayDims > 0) {
                        for (let i = 0; i < member.info; i++) {
                            data.writeFloatLE(structValues[member.name][i], member.offset + (i * 4));
                        }
                    } else {
                        data.writeFloatLE(structValues[member.name],member.offset);
                    }
                    break;
                case LINT:
                    if (member.type.arrayDims > 0) {
                        for (let i = 0; i < member.info; i++) {
                            data.writeBigInt64LE(structValues[member.name][i], member.offset + (i * 8));
                        }
                    } else {
                        data.writeBigInt64LE(structValues[member.name],member.offset);
                    }
                    break;
                case BIT_STRING:
                    if (member.type.arrayDims > 0) {
                        for (let i = 0; i < member.info; i++) {
                            let bitString32bitValue = 0;
                            for (let j = i*32; j < (i+1)*32; j++) {
                                if (j > structValues[member.name].length) break;
                                bitString32bitValue |= (structValues[member.name][j] & 1) << j;
                            }
                            data.writeUInt32LE(bitString32bitValue >>> 0, member.offset + (i * 4));
                        }
                    } else {
                        data.writeUInt32LE(structValues[member.name],member.offset);
                    }
                    break;
                case BOOL:
                    if (structValues[member.name]) {
                        data.writeUInt8(data.readUInt8(member.offset) | 1<<member.info, member.offset)
                    } else {
                        data.writeUInt8(data.readUInt8(member.offset) & ~(1<<member.info), member.offset)
                    }
                    break;
                case STRUCT: {
                    const memberTemplate = this._taglist.templates[member.type.code];
                    const memberStructSize = memberTemplate._attributes.StructureSize;
                    if (member.type.arrayDims > 0) { 
                        for (let i = 0; i < member.info; i++) {
                            const templateData = this._parseWriteData(structValues[member.name][i], memberTemplate);
                            for (let pairs of templateData.entries()) {
                                data[member.offset + (i * memberStructSize) + pairs[0]] = pairs[1];
                            }
                        }
                    } else {
                        const templateData = this._parseWriteData(structValues[member.name], memberTemplate);
                        for (let pairs of templateData.entries()) {
                            data[member.offset + pairs[0]] = pairs[1];
                        }
                    }
                    break;
                }
                default:
                    throw new Error(
                        "Data Type other than SINT, INT, DINT, LINT, BOOL, STRUCT or BIT_STRING returned "
                    );
            }
            /* eslint-enable indent */   
        });
        return data;
    }

    _parseWriteDataArray (newValue) {
        let buf = Buffer.alloc(0)

        newValue.forEach(value => {
            buf = Buffer.concat([buf, this._parseWriteData(value, this._template)])
        })
        
        return buf
    }
    
    get controller_value() {
        return this.state.tag.controllerValue;
    }

    set controller_value(newValue) {
        if (!equals(newValue, this.state.tag.controllerValue)) {
            let lastValue : Buffer | null = null
            if(this.state.tag.controllerValue !== null) 
                lastValue = Buffer.from(this.state.tag.controllerValue);
                   
            this.state.tag.controllerValue = Buffer.from(newValue);

            const { stage_write } = this.state.tag;
            if (!stage_write) {
                this.state.tag.value = newValue;
                this._valueObj = this.parseValue(super.value);
            }

            this.state.timestamp = Date.now();

            if (lastValue !== null) this.emit("Changed", this, this.parseValue(lastValue));
            else this.emit("Initialized", this);
        } else {
            if (this.state.keepAlive > 0) {
                const now = Date.now();

                if (now - this.state.timestamp >= this.state.keepAlive * 1000) {
                    this.state.tag.controllerValue = newValue;

                    const { stage_write } = this.state.tag;
                    if (!stage_write) this.state.tag.value = newValue;
                    this.state.timestamp = now;

                    this.emit("KeepAlive", this);
                }
            }
        }
    }

}



export { Template};