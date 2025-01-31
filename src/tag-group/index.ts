import { Tag } from "../tag";

import { CIP } from "../enip";
import { EventEmitter } from "events";
const { LOGICAL } = CIP.EPATH.segments;
const { MessageRouter } = CIP;
const { MULTIPLE_SERVICE_PACKET } = MessageRouter.services;
import equals from "deep-equal";

export class TagGroup extends EventEmitter {

    state : {
        tags?: any,
        path?: Buffer,
        timestamp?: Date
    } = {};

    constructor() {
        super();

        const pathBuf = Buffer.concat([
            LOGICAL.build(LOGICAL.types.ClassID, 0x02), // Message Router Class ID (0x02)
            LOGICAL.build(LOGICAL.types.InstanceID, 0x01) // Instance ID (0x01)
        ]);

        this.state = {
            tags: {},
            path: pathBuf,
            timestamp: new Date()
        };
    }

    /**
     * Fetches the Number of Tags
     *
     * @readonly
     * @returns {number}
     * @memberof TagGroup
     */
    get length() {
        return Object.keys(this.state.tags).length;
    }
    // endregion

    /**
     * Adds Tag to Group
     *
     * @param {Tag} tag - Tag to Add to Group
     * @memberof TagGroup
     */
    add(tag: Tag) {
        if (!this.state.tags[tag.instance_id]) this.state.tags[tag.instance_id] = tag;
    }

    /**
     * Removes Tag from Group
     *
     * @param {Tag} tag - Tag to be Removed from Group
     * @memberof TagGroup
     */
    remove(tag: Tag) {
        if (this.state.tags[tag.instance_id]) delete this.state.tags[tag.instance_id];
    }

    /**
     * Iterable, Allows user to Iterate of each Tag in Group
     *
     * @param {function} callback - Accepts Tag Class
     * @memberof TagGroup
     */
    forEach(callback) {
        for (let key of Object.keys(this.state.tags)) callback(this.state.tags[key]);
    }

    /**
     * Generates Array of Messages to Compile into a Multiple
     * Service Request
     *
     * @returns {Array} - Array of Read Tag Message Services
     * @memberof TagGroup
     */
    generateReadMessageRequests() {
        const { tags } = this.state;

        // Initialize Variables
        let messages : any[] = [];
        let msgArr : any[] = [];
        let tagIds : any[] = [];
        let messageLength = 0;

        // Loop Over Tags in List
        for (let key of Object.keys(tags)) {
            const tag = tags[key];

            // Build Current Message
            let msg = tag.generateReadMessageRequest();

            messageLength += msg.length + 2;

            tagIds.push(tag.instance_id);
            msgArr.push(msg);

            // If Current Message Length is > 350 Bytes then Assemble Message and Move to Next Message
            if (messageLength >= 300) {
                let buf = Buffer.alloc(2 + 2 * msgArr.length);
                buf.writeUInt16LE(msgArr.length, 0);

                let ptr = 2;
                let offset = buf.length;

                for (let i = 0; i < msgArr.length; i++) {
                    buf.writeUInt16LE(offset, ptr);
                    ptr += 2;
                    offset += msgArr[i].length;
                }

                buf = Buffer.concat([buf, ...msgArr]);
                buf = MessageRouter.build(MULTIPLE_SERVICE_PACKET, this.state.path, buf);

                messages.push({ data: buf, tag_ids: tagIds });
                messageLength = 0;
                msgArr = [];
                tagIds = [];
            }
        }

        // Assemble and Push Last Message
        if (msgArr.length > 0) {
            let buf = Buffer.alloc(2 + 2 * msgArr.length);
            buf.writeUInt16LE(msgArr.length, 0);

            let ptr = 2;
            let offset = buf.length;

            for (let i = 0; i < msgArr.length; i++) {
                buf.writeUInt16LE(offset, ptr);
                ptr += 2;
                offset += msgArr[i].length;
            }

            buf = Buffer.concat([buf, ...msgArr]);
            buf = MessageRouter.build(MULTIPLE_SERVICE_PACKET, this.state.path, buf);

            messages.push({ data: buf, tag_ids: tagIds });
        }

        return messages;
    }

    /**
     * Parse Incoming Multi Service Request Messages
     *
     * @param {Array} responses
     * @param {Arrayany} ids
     * @memberof TagGroup
     */
    parseReadMessageResponses(responses, ids) {
        for (let i = 0; i < ids.length; i++) {
            if(responses[i].generalStatusCode === 0)
                this.state.tags[ids[i]].parseReadMessageResponse(responses[i].data);
        }
    }

    /**
     * Generates Array of Messages to Compile into a Multiple
     * Service Request
     *
     * @returns {Array} - Array of Read Tag Message Services
     * @memberof TagGroup
     */
    generateWriteMessageRequests() {
        const { tags } = this.state;

        // Initialize Variables
        let messages : any[] = [];
        let msgArr : any[] = [];
        let tagIds : any[] = [];
        let messageLength = 0;

        // Loop Over Tags in List
        for (let key of Object.keys(tags)) {
            const tag = tags[key];

            if (tag.value !== null && tag.type === "STRUCT")
                tag.writeObjToValue();

            if (tag.value !== null && !equals(tag.state.tag.value, tag.controller_value)) {
                // Build Current Message
                let msg = tag.generateWriteMessageRequest();
                
                if (tag.type !== "STRUCT") {
                    messageLength += msg.length + 2;

                    tagIds.push(tag.instance_id);
                    msgArr.push(msg);

                    // If Current Message Length is > 350 Bytes then Assemble Message and Move to Next Message
                    if (messageLength >= 350) {
                        let buf = Buffer.alloc(2 + 2 * msgArr.length);
                        buf.writeUInt16LE(msgArr.length, 0);

                        let ptr = 2;
                        let offset = buf.length;

                        for (let i = 0; i < msgArr.length; i++) {
                            buf.writeUInt16LE(offset, ptr);
                            ptr += 2;
                            offset += msgArr[i].length;
                        }

                        buf = Buffer.concat([buf, ...msgArr]);
                        buf = MessageRouter.build(MULTIPLE_SERVICE_PACKET, this.state.path, buf);

                        messages.push({ data: buf, tag_ids: tagIds });
                        messageLength = 0;
                        msgArr = [];
                        tagIds = [];
                    }
                } else {
                    messages.push({data: null, tag: tag});
                }
            }
        }

        // Assemble and Push Last Message
        if (msgArr.length > 0) {
            let buf = Buffer.alloc(2 + 2 * msgArr.length);
            buf.writeUInt16LE(msgArr.length, 0);

            let ptr = 2;
            let offset = buf.length;

            for (let i = 0; i < msgArr.length; i++) {
                buf.writeUInt16LE(offset, ptr);
                ptr += 2;
                offset += msgArr[i].length;
            }

            buf = Buffer.concat([buf, ...msgArr]);
            buf = MessageRouter.build(MULTIPLE_SERVICE_PACKET, this.state.path, buf);

            messages.push({ data: buf, tag_ids: tagIds });
        }

        return messages;
    }

    /**
     * Parse Incoming Multi Service Request Messages
     *
     * @param {Array} responses
     * @param {Arrayany} ids
     * @memberof TagGroup
     */
    parseWriteMessageRequests(responses, ids) {
        for (let id of ids) {
            this.state.tags[id].unstageWriteRequest();
        }
    }
    // endregion

    // region Private Methods

    // endregion

    // region Event Handlers

    // endregion

    //Split tag group from index to index into smaller tag group to stop overloading the PLC
    slice(start: number, end: number){
        let tg = new TagGroup()
        
        let keys = Object.keys(this.state.tags).slice(start, end)

        keys.forEach((key) => {
            tg.add(this.state.tags[key])
        })

        return tg;
    }
}
