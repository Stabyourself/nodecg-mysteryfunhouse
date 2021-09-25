<template>

</template>

<script>
function getNumberWithOrdinal(n) {
    var s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default {
    methods: {
        render() {
            if (this.card_front.complete) {
                this.ctx.clearRect(0,0,this.ctx.canvas.width, this.ctx.canvas.height);

                this.ctx.drawImage(this.card_front, 0, 0);

                if (this.info) {
                    // Draw name
                    this.ctx.font = '110px MatrixRegularSmallCaps';
                    this.ctx.fillStyle = '#1B1515';
                    this.ctx.fillText(this.info.challonge.participant.display_name, 80, 120);

                    let mtCount = 0
                    let winPercentage = null;
                    let bestPlacement = null;
                    let bestPlacementMt = ""

                    if (this.info.career) {
                        // get number of MTs and highest placement

                        function checkPlacement(str, mt) {
                            let placement = parseInt(str.substring(0,3).replace(/\./g, ""))

                            if (!bestPlacement || placement < bestPlacement) {
                                bestPlacement = placement
                                bestPlacementMt = mt
                            }
                        }


                        for (let i = 1; i <= 15; i++) {
                            if (this.info.career[`MT${i}`] && this.info.career[`MT${i}`].length > 0) {
                                mtCount++
                                checkPlacement(this.info.career[`MT${i}`], `MT${i}`)
                            }
                        }

                        if (this.info.career[`MTX`] !== "") {
                            mtCount++
                            checkPlacement(this.info.career[`MTX`], "MTX")
                        }

                        winPercentage = Math.floor(this.info.career["%"])
                    }

                    // Draw stars
                    let x = 683
                    for (let i = 0; i < mtCount; i++) {
                        this.ctx.drawImage(this.card_star, x, 153, 42, 42);

                        x -= 47;
                    }

                    // Draw avatar
                    // console.log(this.img)
                    if (this.img.complete) {
                        this.ctx.drawImage(this.img, 99, 218, 617, 617);
                    }


                    // Draw edition
                    this.ctx.font = 'bold 23px StoneSerifRegular';
                    this.ctx.fillStyle = '#000809';
                    this.ctx.fillText(`${getNumberWithOrdinal(mtCount+1)} Edition`, 90, 870);

                    // Draw serial number
                    this.ctx.textAlign = "right"
                    this.ctx.fillText(`MYST-0016`, 727, 870);
                    this.ctx.textAlign = "left"

                    // Draw class or whatever this is
                    this.ctx.font = 'bold 40px ITCStoneSerifSmallCapsBold';
                    this.ctx.fillStyle = '#000809';

                    let classes = ["Racer"]

                    if (bestPlacement == 1) {
                        classes.push("Champion")
                    }
                    if (this.info.challonge.participant.seed <= 8) {
                        classes.push("Seeded")
                    }
                    this.ctx.fillText(`[${classes.join("/")}]`, 72, 925);


                    // Draw ~lore~
                    this.ctx.font = 'bold 23px StoneSerifRegular';


                    let lines = [
                        `Has a ${winPercentage}% chance to win any match.`,
                        `Placed ${getNumberWithOrdinal(bestPlacement)} in ${bestPlacementMt}.`,
                    ]

                    let y = 955
                    for (let i = 0; i < lines.length; i++) {
                        console.log(lines[i])
                        this.ctx.fillText(lines[i], 72, y);
                        y += 30;
                    }

                    // Draw win/loss
                    let wins = 0
                    let losses = 0

                    if (this.info.career) {
                        wins = String(this.info.career["W's"]).padStart(4, '0');
                        losses = String(this.info.career["L's"]).padStart(4, '0');
                    }

                    this.ctx.font = 'bold 38px MatrixBoldSmallCaps';
                    this.ctx.textAlign = "right"
                    this.ctx.fillText(`WIN/${wins}  LOS/${losses}`, 740, 1107);

                    //passcode
                    this.ctx.font = 'bold 23px StoneSerifRegular';
                    this.ctx.textAlign = "left"
                    this.ctx.fillText(`5318008`, 30, 1150);

                    // copyright
                    this.ctx.textAlign = "right"
                    let year = new Date().getFullYear()
                    this.ctx.fillText(`©${year} MAURICE`, 740, 1150);
                    this.ctx.textAlign = "left"
                }

                this.$emit("update")
            }
        }
    },

    mounted() {
        this.ctx.canvas.width = 813;
        this.ctx.canvas.height = 1185;

        this.card_front = new Image();
        this.card_front.onload = this.render
        this.card_front.src = 'img/card_front.png';

        this.card_star = new Image();
        this.card_star.onload = this.render
        this.card_star.src = 'img/card_star.png';

        var f = new FontFace('MatrixRegularSmallCaps', 'url(css/font/MatrixRegularSmallCaps.ttf)');
        f.load().then(font => {
            document.fonts.add(font)
            this.render()
        })

        f = new FontFace('ITCStoneSerifSmallCapsBold', 'url(css/font/ITCStoneSerifSmallCapsBold.ttf)');
        f.load().then(font => {
            document.fonts.add(font)
            this.render()
        })

        f = new FontFace('StoneSerifRegular', 'url(css/font/StoneSerifRegular.ttf)');
        f.load().then(font => {
            document.fonts.add(font)
            this.render()
        })

        f = new FontFace('MatrixBoldSmallCaps', 'url(css/font/MatrixBoldSmallCaps.ttf)');
        f.load().then(font => {
            document.fonts.add(font)
            this.render()
        })

        this.render()
    },

    watch: {
        info() {
            if (this.info.avatar) {
                this.img.src = this.info.avatar
                this.img.crossOrigin = "Anonymous";

                this.img.onload = this.render
            } else {
                this.img = new Image()
                this.render()
            }
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