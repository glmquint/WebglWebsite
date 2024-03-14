document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("webglCanvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }

    // Vertex shader
    const vsSource = `
        attribute vec2 aPosition;
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    // Fragment shader
    const fsSource = `
        precision highp float;
        uniform vec2 uMouse;
        uniform float uTime;
        void main() {
            float red = uMouse.x;
            float green = uMouse.y;
            float blue = sin(uTime);
            gl_FragColor = vec4(red, green, blue, 1.0);
        }
    `;

    // Create shader program
    const shaderProgram = createShaderProgram(gl, vsSource, fsSource);

    // Get attribute and uniform locations
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    const mouseUniformLocation = gl.getUniformLocation(shaderProgram, "uMouse");
    const timeUniformLocation = gl.getUniformLocation(shaderProgram, "uTime");

    // Create buffer and bind data
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Clear canvas
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use shader program
    gl.useProgram(shaderProgram);

    // Set up attributes
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Mouse position tracking
    let mouseX = 0;
    let mouseY = 0;
    canvas.addEventListener("mousemove", (event) => {
        mouseX = (event.clientX / canvas.width) * 2 - 1;
        mouseY = (event.clientY / canvas.height) * 2 - 1;
    });

    // Render loop
    function render() {
        gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
        gl.uniform1f(timeUniformLocation, performance.now() / 1000); // Convert to seconds
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    render();

});

// Function to create shader program
function createShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// Function to load shader
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

