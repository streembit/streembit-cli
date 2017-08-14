
console.time("fntimer");

function fn1() {
    setTimeout(
        () => {
            console.log("fn1");
            console.timeEnd("fntimer");
            console.time("fntimer2");
        },
        2000
    );
}

function fn2() {
    //setTimeout(
    //    () => {
    //        console.log("fn2");
    //        console.timeEnd("fntimer");
    //        console.time("fntimer");
    //    },
    //    2000
    //);

    console.log("fn2");
    console.timeEnd("fntimer2");
    console.time("fntimer3");
}

function fn3() {
    //setTimeout(
    //    () => {
    //        console.log("fn3");
    //        console.timeEnd("fntimer");
    //        console.time("fntimer");
    //    },
    //    2000
    //);

    console.log("fn3");
    console.timeEnd("fntimer3");
}

async function run() {
    await fn1();
    await fn2();
    await fn3();
}

run();