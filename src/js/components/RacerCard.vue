<template>

</template>

<script>
export default {
    methods: {
        update() {
            if (this.card_front.complete) {
                this.ctx.clearRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);
                this.ctx.fillStyle = '#F00';

                this.ctx.drawImage(this.card_front, 0, 0);

                this.ctx.font = '100px serif';
                this.ctx.fillText(this.info.participant.display_name, 100, 500);


                this.$emit("update")
            }
        }
    },

    mounted() {
        this.ctx.canvas.width = 813;
        this.ctx.canvas.height = 1185;

        this.card_front = new Image();
        this.card_front.onload = () => {
            this.update()
        };
        this.card_front.src = 'img/card_front.png';
    },

    watch: {
        info() {
            this.update()
        }
    },

    props: [
        "ctx",
        "info"
    ],

    data() {
        return {
            card_front: null
        }
    }
};
</script>