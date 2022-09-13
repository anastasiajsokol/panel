const floor = Math.floor;
const sqrt = Math.sqrt;

function create_shader(gl, type, source){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
}

function create_program(gl, vertex_shader, fragment_shader){
    const program = gl.createProgram();
    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
}

function create_attribute_buffer(gl, data, program, name, size, stride = 0, offset = 0){
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);

    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);

    return buffer;
}

function check(obj, name){
    if(!obj){ throw Error("Failed to load: {" + name + "}"); }
    return obj;
}

window.addEventListener("load", () => {
    // setup canvas
    const screen = check(document.getElementById("screen"), "screen");

    let w = screen.width = window.innerWidth;
    let h = screen.height = window.innerHeight;

    const gl = check(screen.getContext("webgl"), "gl");

    gl.viewport(0, 0, w, h);
    gl.clearColor(10 / 255, 10 / 255, 10 / 255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // setup webgl context
    const vertex_source = document.getElementById("panel_vertex").text;
    const fragment_source = document.getElementById("panel_fragment").text;

    const vertex_shader = check(create_shader(gl, gl.VERTEX_SHADER, vertex_source), "vertex shader");
    const fragment_shader = check(create_shader(gl, gl.FRAGMENT_SHADER, fragment_source), "fragment shader");

    const shader = check(create_program(gl, vertex_shader, fragment_shader), "shader");

    create_attribute_buffer(gl, [
        50, -50,
        -50, -50,
        -50, 50,
        
        50, 50,
        50, -50,
        -50, 50
    ], shader, "vertex", 2);

    const trans = gl.getUniformLocation(shader, "trans");
    const res = gl.getUniformLocation(shader, "res");
    const utime = gl.getUniformLocation(shader, "utime");
    const upage = gl.getUniformLocation(shader, "page");
    const globaltime = gl.getUniformLocation(shader, "globaltime");
    
    // current page view
    let page = 0;

    // panel offsets
    let positions = [];
    let max_pos_time = undefined;

    function gen_positions(){
        for(let x = 0; x < w; x += 100){
            for(let y = 0; y < h; y += 100){
                positions.push([x, y]);
            }
        }

        let [x, y] = positions[positions.length - 1];
        x = floor(x / 100) * 100;
        y = floor(y / 100) * 100;
        const dist = sqrt(x * x + y * y);
        max_pos_time = dist / 1000 + 1;
    }

    gen_positions();
    
    // render loop
    const time = {
        time: 0,
        dt: 0,
        epoch: undefined, // set to undefined to stay at zero, set to zero to restart
    };

    function render(timestamp){
        time.dt = (timestamp - time.time) * 0.001;
        time.epoch += time.dt / 2; // animate over 2 seconds
        time.time = timestamp;

        // change epoch
        if(time.epoch > max_pos_time){
            time.epoch = undefined;
            ++page;
        }

        // render
        gl.useProgram(shader);
        gl.uniform2f(res, w, h);
        gl.uniform1f(utime, time.epoch || 0);
        gl.uniform1f(globaltime, time.time / 1000);
        gl.uniform1i(upage, page);

        for(const pos of positions){
            gl.uniform2f(trans, ...pos);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        requestAnimationFrame(render);
    } requestAnimationFrame(render);

    document.addEventListener("keydown", (event) => {
        switch(event.key){
            case ' ':
                if(!time.epoch){
                    time.epoch = 0;
                }
                break;
            
            case 'p':
                ++page;
                break;
            
            case 'r':
                page = 0;
                time.epoch = undefined;
                break;
        }
    });
});
