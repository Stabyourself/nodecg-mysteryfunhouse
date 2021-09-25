<template>

</template>

<script>
export default {
    methods: {
        render() {
            if (this.card_front.complete) {
                this.ctx.clearRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

                this.ctx.drawImage(this.card_front, 0, 0);

                if (this.info) {
                    // Draw name
                    this.ctx.font = '110px MatrixSmallCaps';
                    this.ctx.fillStyle = '#1B1515';
                    this.ctx.fillText(this.info.challonge.participant.display_name, 80, 120);

                    if (this.info.career) {
                        // get number of MTs
                        let mtCount = 0

                        for (let i = 1; i <= 15; i++) {
                            if (this.info.career[`MT${i}`] !== "") {
                                mtCount++
                            }
                        }

                        if (this.info.career[`MTX`] !== "") {
                            mtCount++
                        }

                        // Draw stars
                        let x = 683
                        for (let i = 0; i < mtCount; i++) {
                            this.ctx.drawImage(this.card_star, x, 153, 42, 42);

                            x -= 47;
                        }
                    }

                    // Draw avatar
                    // console.log(this.img)
                    if (this.img.complete) {
                        this.ctx.drawImage(this.img, 99, 218, 617, 617);
                    }
                }

                this.$emit("update")
            }

            requestAnimationFrame(this.render)
        }
    },

    mounted() {
        this.ctx.canvas.width = 813;
        this.ctx.canvas.height = 1185;

        this.card_front = new Image();
        this.card_front.src = 'img/card_front.png';

        this.card_star = new Image();
        this.card_star.src = 'img/card_star.png';

        var f = new FontFace('MatrixSmallCaps', 'url(css/font/MatrixSmallCaps1.woff)');
        f.load().then(font => {
            document.fonts.add(font)
        })

        this.render()
    },

    watch: {
        info() {
            this.img.src = this.info.challonge.participant.attached_participatable_portrait_url
            this.img.crossOrigin = "Anonymous";
        }
    },

    props: [
        "ctx",
        "info"
    ],

    data() {
        return {
            card_front: null,
            img: new Image(),
        }
    }
};
</script>