<template>
  <v-app>
    <v-main>
      <v-container>
        <v-text-field v-model="game" label="Game name"></v-text-field>

        <label class="v-label v-label--active theme--dark" style="font-size: 12px">Boxart</label>
        <div
          class="select-img-wrap mb-1"
          :class="{ 'select-img-wrap--drag-over': dragOver }"
          nodecg-dialog="boxart-select-dialog"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <img class="select-img" :src="currentBoxart ? currentBoxart.url : ''" />
          <div class="select-img-border"></div>
          <div v-if="uploading" class="select-img-upload-overlay">
            <v-progress-circular
              :value="uploadProgress"
              :indeterminate="uploadProgress === 0"
              color="white"
              size="48"
            ></v-progress-circular>
          </div>
        </div>

        <v-progress-linear
          v-if="uploading"
          class="mb-3"
          :value="uploadProgress"
          :indeterminate="uploadProgress === 0"
          height="4"
        ></v-progress-linear>

        <v-alert
          v-if="uploadError"
          type="error"
          density="compact"
          dismissible
          class="mb-3"
          @input="uploadError = ''"
        >
          {{ uploadError }}
        </v-alert>

        <v-text-field v-model="goal" label="Goal"></v-text-field>

        <v-text-field v-model="platform" label="Platform"></v-text-field>

        <v-text-field v-model="submitter" label="Submitter"></v-text-field>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from '../../util.js';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const UPLOAD_WAIT_TIMEOUT = 15000;

export default {
  created() {
    bindReplicant.call(this, 'game');
    bindReplicant.call(this, 'goal');
    bindReplicant.call(this, 'platform');
    bindReplicant.call(this, 'submitter');
    bindReplicant.call(this, 'currentBoxart');

    this.boxartsRep = nodecg.Replicant('assets:boxarts');

    this.onPaste = this.onPaste.bind(this);
    window.addEventListener('paste', this.onPaste);
  },

  beforeDestroy() {
    window.removeEventListener('paste', this.onPaste);
  },

  data() {
    return {
      game: '',
      goal: '',
      platform: '',
      submitter: '',
      currentBoxart: {},
      boxartUrl: '',
      uploading: false,
      uploadProgress: 0,
      uploadError: '',
      dragOver: false,
    };
  },

  methods: {
    onPaste(event) {
      const items = (event.clipboardData || event.originalEvent?.clipboardData || {}).items;
      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            this.uploadBoxart(file);
          }
          break;
        }
      }
    },

    onDragOver() {
      this.dragOver = true;
    },

    onDragLeave() {
      this.dragOver = false;
    },

    onDrop(event) {
      this.dragOver = false;
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) {
        this.uploadBoxart(file);
      }
    },

    async uploadBoxart(file) {
      if (this.uploading) {
        this.uploadError = 'An upload is already in progress. Please wait for it to finish.';
        return;
      }

      if (!file.type || !file.type.startsWith('image/')) {
        this.uploadError = 'Only image files can be used as boxart.';
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        this.uploadError = `That image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB).`;
        return;
      }

      this.uploading = true;
      this.uploadProgress = 0;
      this.uploadError = '';

      const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name || '');
      const ext = extMatch ? extMatch[1] : (file.type.split('/')[1] || 'png');
      const filename = `paste-${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', file, filename);

      try {
        await this.postAsset(formData);
        const asset = await this.waitForBoxart(filename);
        if (asset) {
          this.currentBoxart = asset;
        } else {
          this.uploadError =
            'Upload succeeded, but it did not show up in time. Select it manually from the boxart list.';
        }
      } catch (err) {
        this.uploadError = `Upload failed: ${err.message || err}`;
      } finally {
        this.uploading = false;
        this.uploadProgress = 0;
      }
    },

    postAsset(formData) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/assets/${nodecg.bundleName}/boxarts`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            this.uploadProgress = Math.round((event.loaded / event.total) * 100);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`server responded with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('network error'));
        xhr.send(formData);
      });
    },

    waitForBoxart(filename) {
      return new Promise((resolve) => {
        const existing = (this.boxartsRep.value || []).find((f) => f.base === filename);
        if (existing) {
          resolve(existing);
          return;
        }

        const onChange = (newValue) => {
          const found = (newValue || []).find((f) => f.base === filename);
          if (found) {
            clearTimeout(timeout);
            this.boxartsRep.removeListener('change', onChange);
            resolve(found);
          }
        };

        const timeout = setTimeout(() => {
          this.boxartsRep.removeListener('change', onChange);
          resolve(null);
        }, UPLOAD_WAIT_TIMEOUT);

        this.boxartsRep.on('change', onChange);
      });
    },
  },
};
</script>

<style scoped>
.select-img-wrap {
  position: relative;
}

.select-img-wrap--drag-over {
  outline: 2px dashed #2196f3;
  outline-offset: 2px;
}

.select-img-upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
</style>
