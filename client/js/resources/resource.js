//
// This file manages the loading of resources such as audio and images that the client needs.
//

const resolutions = ["u_720", "u_1080", "u_1440", "u_2160", "u_u"];
const resolution = (function() {
    const width = document.documentElement.clientWidth * window.devicePixelRatio,
          height = document.documentElement.clientHeight * window.devicePixelRatio;
    for (let index = 0; index < resolutions.length; ++index) {
        const resolution = resolutions[index],
              wh_specs = resolution.split("_"),
              res_width = (wh_specs[0] === "u" ? -1 : parseInt(wh_specs[0])),
              res_height = (wh_specs[1] === "u" ? -1 : parseInt(wh_specs[1]));
        if (res_width > 0 && width > res_width)
            continue;
        if (res_height > 0 && height > res_height)
            continue;
        return resolution;
    }
    return "u_u";
})();
const imageExtension = (function() {
    // Check if Google WebP is supported.
    const webpCanvas = document.createElement('canvas');
    if (!!(webpCanvas.getContext && webpCanvas.getContext('2d'))) {
        if (webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0)
            return "webp";
    }
    return "png";
})();
(function() {
    document.body.classList.add(imageExtension === "webp" ? "webp" : "no-webp");
})();

/** Adds the resolution to the URL. **/
function completeURL(url, extension) {
    extension = (extension !== undefined ? extension : imageExtension);
    return url + (resolution !== "u_u" ? "." + resolution : "") + (extension.length > 0 ? "." + extension : "");
}

/** Removes the version from URLs. **/
function removeURLVersion(url) {
    const verIndex = url.lastIndexOf(".v"),
        extIndex = url.indexOf(".", verIndex + 1);
    return (verIndex < 0 ? url : url.substring(0, verIndex) + (extIndex >= 0 ? url.substring(extIndex) : ""));
}


//
// Loading bar.
//

const loadingBar = {
    element: document.getElementById("loading-bar"),
    stage: 0
};

function getPercentageLoaded() {
    const stage = min(loadingBar.stage, loading.stage);
    if (stage < 0 || stage >= stagedResources.length)
        return 0;

    const resources = stagedResources[stage];
    let loaded = 0, total = 0;
    for (let index = 0; index < resources.length; ++index) {
        const resource = resources[index];
        if (!resource.hasMeaningfulLoadStats() || !resource.blocksLoading)
            continue;

        total += 1;
        if (resource.loaded) {
            loaded += 1;
        }
    }
    return (total === 0 ? 0 : loaded / total);
}

function redrawLoadingBar() {
    loadingBar.element.style.width = (getPercentageLoaded() * 100) + "%";
}


//
// Management of the loading.
//

const loading = {
    callback: function() {},
    stage: 0
};

function loadResources() {
    startLoadingStage();
}

function setLoadingCallback(callback) {
    loading.callback = callback;
    for (let missed = 0; missed < loading.stage; ++missed) {
        callback(missed);
    }
}

function getStageLoadingMessage(stage) {
    if (stage === 1)
        return "Fetching Game Assets...";
    if (stage >= 2)
        return "Fetching Teaching Materials...";
    return "The Royal Ur is Loading...";
}

function startLoadingStage() {
    if (loading.stage >= stagedResources.length)
        return;

    const resources = stagedResources[loading.stage];
    for (let index = 0; index < resources.length; ++index) {
        resources[index].load();
    }
    // In case there are no resources left to load at this stage.
    onResourceLoaded(null);
}

function onResourceLoaded(resource) {
    redrawLoadingBar();

    if (loading.stage >= stagedResources.length)
        return;
    const resources = stagedResources[loading.stage];

    // Check that there are no resources that are not yet loaded.
    for (let index = 0; index < resources.length; ++index) {
        const resource = resources[index];
        if (resource.blocksLoading && !resource.loaded)
            return;
    }

    // All resources at the current stage have loaded.
    const previousStage = loading.stage;
    loading.stage += 1;
    loading.callback(previousStage);
    startLoadingStage();
}

function getResourcesLoading() {
    const loading = [];
    for (let index = 0; index < allResources.length; ++index) {
        const resource = allResources[index];
        if (resource.loading) {
            loading.push(resource);
        }
    }
    return loading;
}

function getResourcesLoaded() {
    const loaded = [];
    for (let index = 0; index < allResources.length; ++index) {
        const resource = allResources[index];
        if (resource.loaded) {
            loaded.push(resource);
        }
    }
    return loaded;
}

function reportResourceLoadingStatistics() {
    const loading = getResourcesLoading(),
          loaded = getResourcesLoaded();

    if (loading.length === 0 && loaded.length === 0) {
        console.log("No resources loaded or loading");
        return;
    }
    loaded.sort((a, b) => a.loadStart - b.loadStart);

    let report = "Resource Loading Statistics:\n";
    for (let index = 0; index < loading.length; ++index) {
        report += "  Loading : " + loading[index].name + "\n";
    }
    for (let index = 0; index < loaded.length; ++index) {
        const entry = loaded[index];
        if (!entry.hasMeaningfulLoadStats())
            continue;

        const start = Math.round(entry.loadStart * 10000) / 10 + "ms",
              duration = Math.round(entry.loadDuration * 10000) / 10 + "ms";
        report += "  " + start + " for " + duration + " : " + entry.name + "\n";
    }
    console.log(report);
}


//
// Resource Types.
//

function Resource(name, url) {
    this.__class_name__ = "Resource";
    this.name = name;
    this.url = url;
    this.loadStart = -1;
    this.loadEnd = -1;
    this.loadDuration = -1;
    this.loading = false;
    this.loaded = false;
    this.errored = false;
    this.error = null;
    this.blocksLoading = true;
}
Resource.prototype.updateState = function(state) {
    this.loading = getOrDefault(state, "loading", false);
    this.loaded = getOrDefault(state, "loaded", false);
    this.errored = getOrDefault(state, "errored", false);
    this.error = getOrDefault(state, "error", null);
};
Resource.prototype.load = function() {
    if (this.loading)
        return;
    this.updateState({loading: true});
    this.loadStart = getTime();
    this._load();
};
Resource.prototype._load = unimplemented("_load");
Resource.prototype.onLoad = function() {
    this.updateState({loaded: true});
    this.loadEnd = getTime();
    this.loadDuration = this.loadEnd - this.loadStart;
    onResourceLoaded(this);
};
Resource.prototype.onError = function(error) {
    this.updateState({errored: true, error: (error ? error : null)});
    console.error(error);
};
Resource.prototype.setBlocksLoading = function(blocksLoading) {
    this.blocksLoading = blocksLoading;
};
Resource.prototype.hasMeaningfulLoadStats = () => true;


/** Annotations about other resources. **/
function AnnotationsResource(name, url) {
    Resource.call(this, name, url);
    this.__class_name__ = "AnnotationsResource";
    this.data = null;
}
setSuperClass(AnnotationsResource, Resource);
AnnotationsResource.prototype._load = function() {
    const client = new XMLHttpRequest();
    client.onreadystatechange = function() {
        if (client.readyState !== 4)
            return;
        if (client.status !== 200) {
            this.onError("Error " + client.status + " loading image annotations: " + client.responseText);
            return;
        }
        this.data = JSON.parse(client.responseText);
        this.onLoad();
    }.bind(this);
    client.open('GET', this.url);
    client.send();
};
AnnotationsResource.prototype.get = function(key) {
    return this.data ? this.data[key] : undefined;
}


/** Used to preload an image. **/
function PreloadImageResource(name, url) {
    Resource.call(this, name, url);
    this.__class_name__ = "PreloadImageResource";
    this.image = null;
    this.setBlocksLoading(false);
}
setSuperClass(PreloadImageResource, Resource);
PreloadImageResource.prototype._load = function() {
    this.image = new Image();
    this.image.onerror = function() {
        this.onError("Image Error: " + this.image.error);
    }.bind(this);
    this.image.src = this.url;
    // We don't want this to block the loading of the page.
    this.onLoad();
};


/** Images to be displayed. **/
function ImageResource(name, url, maxWidth, maxHeight) {
    Resource.call(this, name, url);
    this.__class_name__ = "ImageResource";
    this.image = null;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.aspectRatio = (maxWidth && maxHeight ? maxWidth / maxHeight : null);
    this.scaledImages = [];
}
setSuperClass(ImageResource, Resource);
ImageResource.prototype._onImageLoad = function() {
    this.aspectRatio = this.image.width / this.image.height;
    this.onLoad();
};
ImageResource.prototype._load = function() {
    this.image = new Image();
    this.image.onload = function() {
        if (!this.image.width || !this.image.height) {
            this.onError(
                "Failed to load image " + this.name + ", "
                + "invalid width or height (" + this.image.width + " x " + this.image.height + ")"
            );
            return;
        }
        this._onImageLoad();
    }.bind(this);
    this.image.onerror = function() {
        this.onError("Image Error: " + this.image.error);
    }.bind(this);
    this.image.src = completeURL(this.url);
};
ImageResource.prototype.calcImageHeight = function(width) {
    if (!this.aspectRatio)
        throw "Image is not yet loaded, and no aspect ratio has been given in resource.js";
    return width / this.aspectRatio;
}
ImageResource.prototype.getScaledImage = function(width) {
    if (width <= 0)
        throw "Width must be positive: " + width;

    // Determine how many times to halve the size of the image.
    const maxScaleDowns = 4;
    let nextWidth = Math.round(this.image.width / 2),
        scaleDowns = -1;
    while (nextWidth > width && scaleDowns < maxScaleDowns) {
        nextWidth = Math.round(nextWidth / 2);
        scaleDowns += 1;
    }

    // Generate the scaled images.
    while (this.scaledImages.length < scaleDowns) {
        const scaledCount = this.scaledImages.length,
              last = (scaledCount === 0 ? this.image : this.scaledImages[scaledCount - 1]),
              nextWidth = Math.round(last.width / 2),
              nextHeight = Math.round(last.height / 2);

        this.scaledImages.push(renderResource(nextWidth, nextHeight, function(ctx) {
            ctx.drawImage(last, 0, 0, nextWidth, nextHeight);
        }));
    }

    // Return the required scaled image.
    return (scaleDowns <= 0 ? this.image : this.scaledImages[scaleDowns - 1]);
};


/** Sounds to be played. **/
function AudioResource(name, url, options) {
    Resource.call(this, name, url);
    this.__class_name__ = "AudioResource";
    this.volume = getOrDefault(options, "volume", 1);
    this.instances = getOrDefault(options, "instances", 1);
    this.errors = [];
    this.lastErrorTime = LONG_TIME_AGO;
}
setSuperClass(AudioResource, Resource);
AudioResource.prototype._load = function() {
    this.element = new Audio();
    this.element.preload = "auto";
    this.element.addEventListener("error", function() {
        this.onError("Audio Error: " + this.element.error);
    }.bind(this));
    this.element.src = this.url;
    this.element.load();
    this.elements = [this.element];
    setTimeout(function() {
        for (let instance = 1; instance < this.instances; ++instance) {
            this.elements.push(this.element.cloneNode(false));
        }
        this.updateElementSettings();
    }.bind(this));
    this.onLoad(); // Browsers sometimes only load audio when it is played.
    this.updateElementSettings();
};
AudioResource.prototype.updateElementSettings = function() {
    if (!this.loaded)
        return;

    const volume = (audioSettings.muted ? 0 : this.volume * audioSettings.volume);
    for (let index = 0; index < this.elements.length; ++index) {
        this.elements[index].volume = volume;
    }
};
AudioResource.prototype.play = function(onCompleteCallback) {
    onCompleteCallback = (onCompleteCallback ? onCompleteCallback : ()=>{});

    // If we've received two errors trying to play this sound, stop trying for a minute.
    const errored = (this.errors.length >= 2 && getTime() - this.lastErrorTime < 60);
    if (!this.loaded || errored || isAudioErrored()) {
        onCompleteCallback();
        return null;
    }
    // Find an Audio instance to play the sound.
    let element = null;
    for (let index = 0; index < this.elements.length; ++index) {
        if (!isAudioElementPlaying(this.elements[index])) {
            element = this.elements[index];
        }
    }
    // If there are no available Audio elements to play the sound.
    if (element === null) {
        onCompleteCallback();
        return null;
    }
    // Play the sound!
    element.onended = onCompleteCallback;
    const playPromise = element.play();
    // The audio can sometimes be stopped from playing randomly.
    if (playPromise !== undefined) {
        playPromise.then(function() {
            this.errors.length = 0;
            audioSettings.errors.length = 0;
        }.bind(this)).catch(function(error) {
            console.error("Unable to play sound " + this.name + " : " + error);
            this.errors.push(error);
            this.lastErrorTime = getTime();
            audioSettings.errors.push(error);
            audioSettings.lastErrorTime = getTime();
            onCompleteCallback();
        }.bind(this));

    }
    return element;
};
AudioResource.prototype.hasMeaningfulLoadStats = () => false;


//
// Audio management.
//

const audioSettings = {
    muted: false,
    volume: 0.5,
    errors: [],
    lastErrorTime: LONG_TIME_AGO
};

function isAudioErrored() {
    return audioSettings.errors.length >= 5 && getTime() - audioSettings.lastErrorTime < 60;
}

function setAudioMuted(soundMuted) {
    audioSettings.muted = soundMuted;
    updateAudioElements();
}

function setAudioVolume(soundVolume) {
    audioSettings.volume = soundVolume;
    updateAudioElements();
}

function updateAudioElements() {
    for (let index = 0; index < allResources.length; ++index) {
        const resource = allResources[index];
        if (resource instanceof AudioResource) {
            resource.updateElementSettings();
        }
    }
}

function isAudioElementPlaying(element) {
    return element.currentTime > 0 && !element.paused && !element.ended && element.readyState > 2;
}

function playSound(key, onCompleteCallback, overrideTabActive) {
    // We usually don't want to play any sounds if the tab is not active.
    if (document.hidden && !overrideTabActive)
        return null;

    // Allow random choice of sound from packs of audio clips.
    if(window.audioPacks && audioPacks[key]) {
        key = randElement(audioPacks[key]);
    }
    for (let index = 0; index < allResources.length; ++index) {
        const resource = allResources[index];
        if (resource instanceof AudioResource && resource.name === key)
            return resource.play(onCompleteCallback);
    }
    error("Unable to find the sound \"" + key + "\"");
    return null;
}



//
// Image loading.
//

function findImageResource(key) {
    for (let index = 0; index < allResources.length; ++index) {
        const resource = allResources[index];
        if (resource instanceof ImageResource && resource.name === key)
            return resource;
    }
    return null;
}

function getImageURL(key) {
    return completeURL(findImageResource(key).url);
}

function getImageResource(key, width, nullOnMissing) {
    const imageResource = findImageResource(key);
    if(!imageResource)
        throw "Missing image resource " + key;
    if(!imageResource.loaded) {
        if (nullOnMissing)
            return null;
        throw "Image resource " + key + " is not yet loaded!";
    }
    if (!width)
        return imageResource.image;
    return imageResource.getScaledImage(width);
}

function renderResource(width, height, renderFunction) {
    if (isNaN(width) || isNaN(height))
        throw "Width and height cannot be NaN, was given " + width + " x " + height;
    if (width < 1 || height < 1)
        throw "Width and height must both be at least 1, was given " + width + " x " + height;

    const canvas = document.createElement("canvas"),
          ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    renderFunction(ctx, canvas);
    return canvas;
}
