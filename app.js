document.addEventListener("DOMContentLoaded", (event) => setup(event, window.location.search.includes("forceDisableWebGL")));

function setup(event, forceDisableWebGL) {

    // Mouse position tracking
    let mouseX = 0;
    let wantMouseX = 0;
    let mouseY = 0;
    let wantMouseY = 0;

    // For the button gradient on hover
    let buttons = document.getElementsByClassName("mouse-cursor-gradient-tracking");

    function updateMousePosition(clientX, clientY) {
        wantMouseX = (clientX / window.innerWidth) * 2 - 1;
        wantMouseY = (-clientY / window.innerHeight) * 2 - 1; // Invert Y
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            let rect = btn.getBoundingClientRect();
            let x = clientX - rect.left;
            let y = clientY - rect.top;
            btn.style.setProperty('--x', x + 'px')
            btn.style.setProperty('--y', y + 'px')
        }
    };
    updateMousePosition(-100,-100)
    body = document.getElementsByTagName("body")[0]

    // Body mouse position tracking
    body.addEventListener("mousemove", (event) => {
        updateMousePosition(event.clientX, event.clientY)
    });

    // Equivalent touch screen position tracking
  //   body.addEventListener("touchmove", (event) => {
		// event.preventDefault();
		// const touch = event.changedTouches[0];
  //       updateMousePosition(touch.pageX, touch.pageY)
  //   });
    window.addEventListener('deviceorientation', (e) => {
        let gamma = (e.gamma) / 30
        let beta = (e.beta) / 30
        if (window.orientation == 0){
            wantMouseX = gamma
            wantMouseY = -beta
        } else {
            wantMouseX = beta
            wantMouseY = gamma
        }
    });



    const canvas = document.getElementById("webglCanvas");
    const gl = canvas.getContext("webgl");

    if (!gl ||forceDisableWebGL) {
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

		uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uTime;
        uniform float uExcitement;

        #define S(a, b, t) smoothstep(a, b, t)
        #define NUM_LAYERS 4.

        #define DURATION 230.
        #define TRANSITION 20.


        float N21(vec2 p) {
            vec3 a = fract(vec3(p.xyx) * vec3(213.897, 653.453, 253.098));
            a += dot(a, a.yzx + 79.76);
            return fract((a.x + a.y) * a.z);
        }

        vec2 GetPos(vec2 id, vec2 offs, float t) {
            float n = N21(id+offs);
            float n1 = fract(n*10.);
            float n2 = fract(n*100.);
            float a = t+n;
            return offs + vec2(sin(a*n1), cos(a*n2))*.4;
        }

        float GetT(vec2 ro, vec2 rd, vec2 p) {
            return dot(p-ro, rd); 
        }

        float LineDist(vec3 a, vec3 b, vec3 p) {
            return length(cross(b-a, p-a))/length(p-a);
        }

        float df_line( in vec2 a, in vec2 b, in vec2 p)
        {
            vec2 pa = p - a, ba = b - a;
            float h = clamp(dot(pa,ba) / dot(ba,ba), 0., 1.);	
            return length(pa - ba * h);
        }

        float line(vec2 a, vec2 b, vec2 uv) {
            float r1 = .04;
            float r2 = .01;
            
            float d = df_line(a, b, uv);
            float d2 = length(a-b);
            float fade = S(1.5, .5, d2);
            
            fade += S(.05, .02, abs(d2-.75));
            return S(r1, r2, d)*fade;
        }

        float NetLayer(vec2 st, float n, float t) {
            vec2 id = floor(st)+n;

            st = fract(st)-.5;
        
            vec2 p[9];
            int i=0;
            for(float y=-1.; y<=1.; y++) {
                for(float x=-1.; x<=1.; x++) {
                         if(i==0) p[0] = GetPos(id, vec2(x,y), t);
                    else if(i==1) p[1] = GetPos(id, vec2(x,y), t);
                    else if(i==2) p[2] = GetPos(id, vec2(x,y), t);
                    else if(i==3) p[3] = GetPos(id, vec2(x,y), t);
                    else if(i==4) p[4] = GetPos(id, vec2(x,y), t);
                    else if(i==5) p[5] = GetPos(id, vec2(x,y), t);
                    else if(i==6) p[6] = GetPos(id, vec2(x,y), t);
                    else if(i==7) p[7] = GetPos(id, vec2(x,y), t);
                    else if(i==8) p[8] = GetPos(id, vec2(x,y), t);
                    i++;
                }
            }
            
            float m = 0.;
            float sparkle = 0.;
            
            for(int i=0; i<9; i++) {
                m += line(p[4], p[i], st);

                float d = length(st-p[i]);

                float s = (.005/(d*d));
                s *= S(1., .7, d);
                float pulse = sin((fract(p[i].x)+fract(p[i].y)+t)*5.)*.4+.6;
                pulse = pow(pulse, 20.)*(5.*uExcitement+1.);

                s *= pulse;
                sparkle += s;
            }
            
            m += line(p[1], p[3], st);
            m += line(p[1], p[5], st);
            m += line(p[7], p[5], st);
            m += line(p[7], p[3], st);
            
            float sPhase = (sin(t+n)+sin(t*.1))*.25+.5;
            sPhase += pow(sin(t*.1)*.5+.5, 50.)*5.;
            m += sparkle*sPhase;//(*.5+.5);
            
            return m;
        }
        void main() {
            vec2 uv = (gl_FragCoord.xy-uResolution.xy*.5)/uResolution.y;
            vec2 M = uMouse.xy-.5;//uResolution.xy-.5;
            
            float t = uTime*.1;
            
            float s = sin(t);
            float c = cos(t);
            //mat2 rot = mat2(c, -s, s, c);
            vec2 st = uv;//*rot;  
            //M *= rot*2.;
            
            float m = 0.;
            for(float i=0.; i<1.; i+=1./NUM_LAYERS) {
                float z = fract(t+i);
                float size = mix(15., 1., z);
                float fade = S(0., .6, z)*S(1., .8, z);
                
                m += fade * NetLayer(st*size-M*z, i, uTime);
            }

            float glow = uv.y*1.*(.4*uExcitement+1.);

            vec3 baseCol = vec3(s, cos(t*.4), -sin(t*.24))*.4+.6;
            vec3 col = baseCol*m;
            col += baseCol*glow;
            

            col *= 1.-dot(uv,uv);
            // t = mod(uTime, DURATION);
            // col *= S(-5., TRANSITION, t)*S(DURATION + 5., DURATION-TRANSITION, t);
            
            gl_FragColor = vec4(col*uv.y*1.5,1);
            //gl_FragColor = vec4(uMouse, 1., 1.);
        }
    `;

    // Create shader program
    const shaderProgram = createShaderProgram(gl, vsSource, fsSource);

    // Get attribute and uniform locations
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aPosition");
	const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "uResolution");
    const mouseUniformLocation = gl.getUniformLocation(shaderProgram, "uMouse");
    const timeUniformLocation = gl.getUniformLocation(shaderProgram, "uTime");
    const excitementUniformLocation = gl.getUniformLocation(shaderProgram, "uExcitement");

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

    
	// Update resolution uniform when canvas size changes
    function updateResolution() {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    updateResolution();
	window.addEventListener("resize", updateResolution);

    // Excitement factor update when pressing an eccitor object
    let excitement = 0;
    let wantExcetement = 0;
    eccitors = document.getElementsByClassName("eccitor");
    for (let i = 0; i < eccitors.length; i++) {
        const eccitor = eccitors[i];
        eccitor.addEventListener('mouseleave', (event) => {
            wantExcetement = 0;
        })
        eccitor.addEventListener('mouseenter', (event) => {
            wantExcetement = 1;
        })
    }

    // Linear interpolation utility
    function lerp( a, b, alpha ) {
        return a + alpha * (b - a);
    }

    // we accept up to 1000 (~16 minutes) seconds of clock skew for synchronization
	beginTime = Date.now() % 1000000 

    toColorize = document.getElementsByClassName("colorize");

    let lerpFactor = 0.3;
    // Render loop
    function render() {
        rightNow = beginTime + performance.now() // allow sync between devices
        mouseX = lerp(mouseX, wantMouseX, lerpFactor);
        mouseY = lerp(mouseY, wantMouseY, lerpFactor);
        excitement = lerp(excitement, wantExcetement, lerpFactor);
        gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
        gl.uniform1f(timeUniformLocation, rightNow / 1000); // Convert to seconds
        gl.uniform1f(excitementUniformLocation, excitement);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        t = rightNow / 10000;
        r = Math.sin(t)
        g = Math.cos(t*0.4)
        b = Math.sin(t*0.24)
        color = 'rgb(' + (r*0.4+0.6)*256 + ', ' + (g*0.4 + 0.6)*256 + ', ' + (-b*0.4 + 0.6)*256
        for (let i = 0; i < toColorize.length; i++) {
            const elem = toColorize[i];
            elem.style.setProperty('--34clr', color + ', 75%)');
            elem.style.setProperty('--clr', color + ', 100%)');
        }
        requestAnimationFrame(render);
    }
    render();

};

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

