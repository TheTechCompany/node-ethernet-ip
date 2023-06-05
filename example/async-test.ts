let bool = true;

(async () => {

    while (bool){
        console.log('Time', Date.now());

        await new Promise((resolve) => setTimeout(() => resolve(true), 1000));
    }

})();
