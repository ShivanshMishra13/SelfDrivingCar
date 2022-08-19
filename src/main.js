const canvas = document.getElementById('carCanvas')

canvas.width = 200
canvas.height = window.innerHeight


class Controls {
    constructor(Type) {
        if (Type == "Dummy") {
            this.forward = true
            this.left = false
            this.right = false
            this.reverse = false
        } else {
            this.forward = false
            this.left = false
            this.right = false
            this.reverse = false
        }
    }
}


class Car {
    constructor(x, y, width, height, controlType, maxspeed = 3) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height

        this.speed = 0
        this.accl = 0.2
        this.maxspeed = maxspeed
        this.friction = 0.05
        this.angle = 0

        this.useBrain = true

        this.damage = false
        if (controlType != "Dummy") {
            this.sensor = new Sensor(this)
            this.brain = new NeuralNetwork(
                [this.sensor.rayCount, 6, 4]

            )


        }


        this.control = new Controls(controlType)

    }




    draw(ctx, color,drawSensor=false) {
        if (this.damage) {
            ctx.fillStyle = "grey"
        } else {
            ctx.fillStyle = color
        }
        ctx.beginPath()
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y)

        for (var i = this.polygon.length; i--;) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y)

        }
        ctx.fill()
        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx)
        }
    }

    update(roadBorders, traffic) {

        if (!this.damage) {
            this.#move()
            this.polygon = this.#createPolygon()
            this.damage = this.#assesDamage(roadBorders, traffic)
        }
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic)
            const offsets = this.sensor.readings.map(s=>s == null?0: 1-s.offset)

            const output = NeuralNetwork.feedForward(offsets, this.brain)

            //console.log(output[0])

            if (this.useBrain) {
                this.control.forward = output[0]
                this.control.left = output[1]
                this.control.right = output[2]
                this.control.reverse = output[3]

            }
        }



    }
    #assesDamage(roadBorders, traffic) {
        for (var i = 0; i < roadBorders.length; i++) {
            if (polyIntersect(this.polygon, roadBorders[i])) {
                return true
            }
        }


        for (var i = 0; i < traffic.length; i++) {
            if (polyIntersect(this.polygon, traffic[i].polygon)) {
                return true
            }
        }
        return false
    }
    #createPolygon() {
        let points = []
        let rad = Math.hypot(this.width, this.height)/2
        let alpha = Math.atan2(this.width, this.height)

        points.push({
            x: this.x-Math.sin(this.angle-alpha)*rad,
            y: this.y-Math.cos(this.angle-alpha)*rad
        }
        )

        points.push({
            x: this.x-Math.sin(this.angle+alpha)*rad,
            y: this.y-Math.cos(this.angle+alpha)*rad
        }
        )

        points.push({
            x: this.x-Math.sin(Math.PI+this.angle-alpha)*rad,
            y: this.y-Math.cos(Math.PI+this.angle-alpha)*rad
        }
        )
        points.push({
            x: this.x-Math.sin(Math.PI+this.angle+alpha)*rad,
            y: this.y-Math.cos(Math.PI+this.angle+alpha)*rad
        }
        )
        return points


    }


    #move() {
        if (this.control.forward) {
            this.speed += this.accl

        }
        if (this.control.reverse) {
            this.speed -= this.accl
        }
        if (this.speed != 0) {
            let flip = this.speed > 0?1: -1
            if (this.control.left) {
                this.angle += 0.03*flip
            }
            if (this.control.right) {
                this.angle -= 0.03*flip
            }
        }
        if (this.speed > this.maxspeed) {
            this.speed = this.maxspeed
        }
        if (this.speed<-this.maxspeed/2) {
            this.speed -= this.maxspeed/2
        }


        if (this.speed > 0) {
            this.speed -= this.friction
        }
        if (this.speed < 0) {
            this.speed += this.friction
        }
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }
        this.y -= Math.cos(this.angle)*this.speed
        this.x -= Math.sin(this.angle)*this.speed

    }

}
class NeuralNetwork {

    constructor(neuronCount) {
        this.levels = []
        for (var i = 0; i < neuronCount.length-1; i++) {
            this.levels.push(
                new Level(
                    neuronCount[i],
                    neuronCount[i+1]

                )

            )
        }
    }

    static feedForward(givenInputs, network) {
        let output = Level.feedForward(givenInputs, network.levels[0])

        for (var i = 1; i < network.levels.length; i++) {
            output = Level.feedForward(
                output, network.levels[i]
            )

        }
        console.log(output)
        return output

    }


}




class Level {
    constructor(inputCount, outputCount) {
        this.input = new Array(inputCount)
        this.output = new Array(outputCount)
        this.biases = new Array(outputCount)


        this.wieghts = []
        for (var i = 0; i < inputCount; i++) {
            this.wieghts[i] = new Array(outputCount)
        }

        Level.#randomize(this)

    }

    static #randomize(level) {
        for (var i = 0; i < level.input.length; i++) {
            for (var j = 0; j < level.output.length; j++) {
                level.wieghts[i][j] = Math.random()*2-1
            }

        }


        for (var i = 0; i < level.biases.length; i++) {
            level.biases[i] = Math.random()*2-1
        }

    }

    static feedForward(giveInputs, level,tt="nottest") {
        let outs=Array(4)
        for (var i = 0; i < level.input.length; i++) {
            level.input[i] = giveInputs[i]
        }

        for (var i = 0; i < level.output.length; i++) {
            let sum = 0
            for (var j = 0; j < level.input.length; j++) {
                sum += level.input[j]*level.wieghts[j][i]
            }
        

            if (sum > level.biases[i]) {
                outs[i] = 1
            } else {
                outs[i] = 0
            }


        }
        if(tt=="test"){
        console.log(outs)
        }
        return outs



    }


}
class Road {
    constructor(x, width, lc = 3) {
        this.x = x
        this.width = width
        this.laneCount = lc

        this.left = x-this.width/2
        this.right = x+this.width/2

        const infinity = 10000000

        this.top=-infinity
        this.bottom = infinity
        const topLeft = {
            x: this.left,
            y: this.top
        }
        const topRight = {
            x: this.right,
            y: this.top
        }
        const bottomLeft = {
            x: this.left,
            y: this.bottom
        }
        const bottomRight = {
            x: this.right,
            y: this.bottom
        }

        this.borders = [
            [topLeft,
                bottomLeft],
            [topRight,
                bottomRight]



        ]


    }

    getLaneCenter(laneIndex) {
        const lineWidth = this.width/this.laneCount
        return this.left+lineWidth/2+laneIndex*lineWidth
    }

    draw(ctx) {
        ctx.lineWidth = 5
        ctx.strokeStyle = "white"
        for (var i = 1; i <= this.laneCount-1; i++) {
            const x = lerp(
                this.left,
                this.right, i/this.laneCount

            )

            ctx.setLineDash([20, 20])



            ctx.beginPath()

            ctx.moveTo(x, this.top)
            ctx.lineTo(x, this.bottom)

            ctx.stroke()



        }
        ctx.setLineDash([])
        this.borders.forEach(border=> {
            ctx.beginPath()
            ctx.moveTo(border[0].x, border[0].y)
            ctx.lineTo(border[1].x, border[1].y)
            ctx.stroke()
        })



    }
}

class Sensor {
    constructor(car) {
        this.car = car
        this.rayCount = 5
        this.rayLenght = 100
        this.raySpread = Math.PI/2


        this.rays = []
        this.readings = []
    }

    update(roadBorders, traffic) {

        this.#casteRays()
        this.readings = []
        for (var i = 0; i < this.rays.length; i++) {

            this.readings.push(
                this.#getReading(
                    this.rays[i],
                    roadBorders,
                    traffic
                )

            )
        }
    }
    #getReading(ray, roadBorders, traffic) {
        let touches = []

        for (var i = 0; i < roadBorders.length; i++) {
            let touch = getIntersection(
                ray[0],
                ray[1],
                roadBorders[i][0],
                roadBorders[i][1]

            )
            if (touch) {
                touches.push(touch)
            }
        }



        for (var i = 0; i < traffic.length; i++) {
            let poly = traffic[i].polygon
            for (var j = 0; j < poly.length; j++) {

                const value = getIntersection(
                    ray[0],
                    ray[1],
                    poly[j],
                    poly[(j+1)%poly.length]


                )
                if (value) {
                    touches.push(value)
                }
            }

        }

        if (touches.length == 0) {
            return null
        } else {
            const offsets = touches.map(e=>e.offset)
            const minoff = Math.min(...offsets)

            return touches.find(e=>e.offset == minoff)
        }


    }

    #casteRays() {
        this.rays = []

        for (var i = 0; i < this.rayCount; i++) {
            const rayAngle = lerp(
                this.raySpread/2,
                -this.raySpread/2,
                i/(this.rayCount-1)



            )+this.car.angle

            const start = {
                x: this.car.x,
                y: this.car.y
            }

            const end = {
                x: this.car.x-Math.sin(rayAngle)*this.rayLenght,
                y: this.car.y-Math.cos(rayAngle)*this.rayLenght
            }

            this.rays.push([start, end])
        }
    }


    draw(ctx) {
        for (var i = 0; i < this.rayCount; i++) {
            let end = this.rays[i][1]

            if (this.readings[i]) {
                end = this.readings[i]
            }
            ctx.beginPath()
            ctx.lineWidth = 2
            ctx.strokeStyle = "yellow"



            ctx.moveTo(
                this.rays[i][0].x,
                this.rays[i][0].y
            )
            ctx.lineTo(
                end.x,
                end.y
            )

            ctx.stroke()




            ctx.beginPath()
            ctx.lineWidth = 2
            ctx.strokeStyle = "black"



            ctx.moveTo(
                this.rays[i][1].x,
                this.rays[i][1].y
            )
            ctx.lineTo(
                end.x,
                end.y
            )

            ctx.stroke()




        }

    }
}




function lerp(A, B, t) {
    return A+(B-A)*t
}

function getIntersection(A, B, C, D) {
    const tTop = (D.x-C.x)*(A.y-C.y)-(D.y-C.y)*(A.x-C.x);

    const uTop = (C.y-A.y)*(A.x-B.x)-(C.x-A.x)*(A.y-B.y);

    const bottom = (D.y-C.y)*(B.x-A.x)-(D.x-C.x)*(B.y-A.y);

    if (bottom != 0) {
        const t = tTop/bottom;
        const u = uTop/bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            }
        }
    }

    return null
}

function polyIntersect(poly1, poly2) {

    for (let i = 0; i < poly1.length; i++) {

        for (let j = 0; j < poly2.length; j++) {
            const touch = getIntersection(
                poly1[i],
                poly1[(i+1)%poly1.length],
                poly2[j],
                poly2[(j+1)%poly2.length]
            );
            if (touch) {
                return true;
            }
        }
    }
    return false;
}


ctx = canvas.getContext("2d")
road = new Road(canvas.width/2, canvas.width*0.9, 5)


cars = generateCars(50)

var traffic = [
    new Car(road.getLaneCenter(4), -100, 30, 50, "Dummy"), new Car(road.getLaneCenter(1), -200, 30, 50, "Dummy")

]



function generateCars(N) {
    let cars=[]
    for (var i = 0; i < N; i++) {
        cars.push(new Car(road.getLaneCenter(2),100,30,50,"AI"))
    }
    return cars
}


animate()

function animate() {
    canvas.height = window.innerHeight
    bestCar=cars.find(e=>e.y==Math.min(...cars.map(s=>s.y)))

    for (var i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, [])
    }
    for (var i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic)
    
    }
    
    ctx.save()
    ctx.translate(0, -bestCar.y+canvas.height*0.7)
    road.draw(ctx)
    for (var i = 0; i < traffic.length; i++) {
        traffic[i].draw(ctx, "red")
    }
    ctx.globalAlpha=0.2
    for (var i = 0; i < cars.length; i++) {
        cars[i].draw(ctx,"blue")
    
    }
    ctx.globalAlpha=1
    bestCar.draw(ctx,"blue",true)
    

    ctx.restore()

    requestAnimationFrame(animate)

}