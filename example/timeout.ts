import { Controller, ControllerManager, Tag, Types } from '../src'

(async () => {
    let manager = new ControllerManager();

    let controller = manager.addController('192.168.108.33', 0, 500, false)


    const reconnect = async () => {
        manager = new ControllerManager();

        controller = manager.addController('192.168.108.33', 0, 500, false)
    
        await controller.connect()

        const aTag = controller.addTag('A')
        const bTag = controller.addTag('B')
        const cTag = controller.addTag('C')
        const dTag = controller.PLC?.newTag('D')
    }


    await controller.connect()

    const aTag = controller.addTag('A')
    const bTag = controller.addTag('B')
    const cTag = controller.addTag('C')
    const dTag = controller.addTag('D')
    
    // controller.()

    console.log(controller.PLC?.tagList)

    await new Promise((resolve) => setTimeout(() => resolve(true), 1000));

    await controller.disconnect()

    await reconnect();

    
    await new Promise((resolve) => setTimeout(() => resolve(true), 1000));

    await controller.disconnect()

    await reconnect();

    await new Promise((resolve) => setTimeout(() => resolve(true), 1000));

    await controller.disconnect()

    await reconnect();

    console.log("Don e")
    // controller.tagList[0];
    // const tag = new Tag('A');

    // await controller.readTag(tag)

    // console.log(tag.value)
})();

