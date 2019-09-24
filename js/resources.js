//
// This file manages the loading of resources such as audio and images that the client needs.
//

const resourceStats = {};
let onAllResourcesLoadedFn = null;

function loadResources(onComplete) {
    onAllResourcesLoadedFn = function() {
        markResourceLoading("sprite_splitting");
        splitSpritesIntoImages();
        markResourceLoaded("sprite_splitting", true);

        onComplete();
    };

    loadImages();
    loadSprites();
    loadAudio();
}

function getResourceStats(name) {
    if (!resourceStats.hasOwnProperty(name)) {
        resourceStats[name] = {
            name: name,
            loaded: false,
            startLoadTime: LONG_TIME_AGO,
            endLoadTime: LONG_TIME_AGO,
            loadDuration: NaN
        };
    }

    return resourceStats[name];
}

function getResourcesLoading() {
    const loading = [];
    for (let key in resourceStats) {
        if (!resourceStats.hasOwnProperty(key))
            continue;

        const stats = resourceStats[key];
        if (stats.loaded)
            continue;

        loading.push(stats);
    }
    return loading;
}

function getResourcesLoaded() {
    const loaded = [];
    for (let key in resourceStats) {
        if (!resourceStats.hasOwnProperty(key))
            continue;

        const stats = resourceStats[key];
        if (!stats.loaded)
            continue;

        loaded.push(stats);
    }
    return loaded;
}

function markResourceLoading(name) {
    getResourceStats(name).startLoadTime = getTime();
}

function markResourceLoaded(name, skipCompleteCheck) {
    // We only want to countdown in an animation frame for consistency
    window.requestAnimationFrame(() => {
        const stats = getResourceStats(name);

        stats.loaded = true;
        stats.endLoadTime = getTime();
        stats.loadDuration = stats.endLoadTime - stats.startLoadTime;
        redrawLoadingBar();

        // If all resources have been loaded
        if (!skipCompleteCheck && getResourcesLoading().length === 0) {
            if (onAllResourcesLoadedFn === null)
                throw "Completed loading resources, but there is no onAllResourcesLoadedFn";

            const onCompleteFn = onAllResourcesLoadedFn;
            onAllResourcesLoadedFn = null;

            onCompleteFn();
        }
    });
}

function reportResourceLoadingStatistics() {
    const loading = getResourcesLoading(),
          loaded = getResourcesLoaded();

    if (loading.length === 0 && loaded.length === 0) {
        console.log("No resource loading statistics recorded");
        return;
    }

    loaded.sort((a, b) => {
        const x = a.loadDuration,
              y = b.loadDuration;
        return (x < y) ? 1 : ((x > y) ? -1 : 0);
    });

    let report = "Resource Loading Statistics:\n";
    for (let index = 0; index < loading.length; ++index) {
        const entry = loading[index];

        report += "  Loading : " + entry.name;
        report += "\n";
    }

    for (let index = 0; index < loaded.length; ++index) {
        const entry = loaded[index];

        report += "  " + Math.round(entry.loadDuration * 10000) / 10 + "ms : " + entry.name;
        report += "\n";
    }

    console.log(report);
}


//
// LOADING BAR
//

const loadingBarElement = document.getElementById("loading-bar");

function getPercentageLoaded() {
    const loaded = getResourcesLoaded(),
          loading = getResourcesLoading();

    if (loading.length === 0 && loaded.length === 0)
        return 0;

    return loaded.length / (loading.length + loaded.length);
}

function redrawLoadingBar() {
    loadingBarElement.style.width = (getPercentageLoaded() * 100) + "%";
}



//
// AUDIO
//

const audioResources = [
    // Sounds
    
    // Sounds when moving a tile
    {
        key: "place_1",
        url: "res/audio/place_1.mp4"
    }, {
        key: "place_2",
        url: "res/audio/place_2.mp4"
    }, {
        key: "place_3",
        url: "res/audio/place_3.mp4"
    }, {
        key: "place_4",
        url: "res/audio/place_4.mp4"
    },

    // Sounds when selecting a tile
    {
        key: "pickup_1",
        url: "res/audio/pickup_1.mp4"
    }, {
        key: "pickup_2",
        url: "res/audio/pickup_2.mp4"
    }, {
        key: "pickup_3",
        url: "res/audio/pickup_3.mp4"
    },
    
    // Sound when trying to pick up a tile that cannot be moved
    {
        key: "error",
        url: "res/audio/error.mp4",
        volume: 0.5,
        instances: 3
    },
    
    // Sound when taking out an enemy tile
    {
        key: "kill",
        url: "res/audio/kill.mp4",
        volume: 0.5
    },
    
    // Sound when hovering over tiles
    {
        key: "hover",
        url: "res/audio/hover.mp4",
        volume: 0.5,
        instances: 3
    },
    
    // Sounds when rolling dice
    {
        key: "dice_click",
        url: "res/audio/dice_click.mp4",
        volume: 0.5,
        instances: 5
    },
    {
        key: "dice_hit",
        url: "res/audio/dice_hit.mp4",
        volume: 0.3,
        instances: 4
    },
    {
        key: "dice_select",
        url: "res/audio/dice_select.mp4",
        volume: 0.3,
        instances: 4
    },

    // Sounds when a message pops up
    {
        key: "typewriter_key",
        url: "res/audio/typewriter_key.mp4",
        instances: 4
    },
    {
        key: "typewriter_end",
        url: "res/audio/typewriter_end.mp4",
    },

    // Firework sounds
    {
        key: "firework_explode",
        url: "res/audio/firework_explode.mp4",
        volume: 0.5,
        instances: 4
    },
    {
        key: "firework_rocket",
        url: "res/audio/firework_rocket.mp4",
        volume: 0.05,
        instances: 4
    }
];

const audioPacks = {
    "place": ["place_1", "place_2", "place_3", "place_4"],
    "pickup": ["pickup_1", "pickup_2", "pickup_3"]
};

const audioPreferences = {
    songsMuted: false,
    songsVolume: 0.5,

    soundMuted: false,
    soundVolume: 0.5
};

function setSongsMuted(songsMuted) {
    audioPreferences.songsMuted = songsMuted;
    updateAudioVolumes();
}

function setSongsVolume(songsVolume) {
    audioPreferences.songsVolume = songsVolume;
    updateAudioVolumes();
}

function setSoundMuted(soundMuted) {
    audioPreferences.soundMuted = soundMuted;
    updateAudioVolumes();
}

function setSoundVolume(soundVolume) {
    audioPreferences.soundVolume = soundVolume;
    updateAudioVolumes();
}

function updateAudioVolumes() {
    const songVolume = (!audioPreferences.songsMuted ? audioPreferences.songsVolume : 0),
          soundVolume = (!audioPreferences.soundMuted ? audioPreferences.soundVolume : 0);

    for(let index = 0; index < audioResources.length; ++index) {
        const resource = audioResources[index];

        if(!resource.elements)
            continue;

        let volume = (resource.song ? songVolume : soundVolume);
        
        if(resource.volume) {
            volume *= resource.volume;
        }
        
        for(let elementIndex = 0; elementIndex < resource.elements.length; ++elementIndex) {
            resource.elements[elementIndex].volume = volume;
        }
    }
}

function isAudioPlaying(element) {
    return element.currentTime > 0
            && !element.paused
            && !element.ended
            && element.readyState > 2;
}

function playSound(key, onComplete, overrideTabActive) {
    // We usually don't want to play any sounds if the tab is not active
    if (document.hidden && !overrideTabActive)
        return;

    // Allow random choice of sound from packs
    if(audioPacks[key]) {
        key = randElement(audioPacks[key]);
    }

    for(let index = 0; index < audioResources.length; ++index) {
        const resource = audioResources[index];

        if(resource.key !== key)
            continue;
        
        let element = undefined;
        
        for(let elementIndex = 0; elementIndex < resource.elements.length; ++elementIndex) {
            const potentialElement = resource.elements[elementIndex];
            
            if(!isAudioPlaying(potentialElement)) {
                element = potentialElement;
                break;
            }
        }

        if(element === undefined) {
            console.error("Ran out of audio instances to play the sound \"" + key + "\"");
            return;
        }
        
        element.onended = onComplete;
        const playPromise = element.play();
        
        // It can sometimes be stopped from playing randomly
        if (playPromise !== undefined) {
            playPromise.catch((error1) => {
                element.play().catch((error2) => {
                    console.error("Unable to play sound " + key + " : " + error2);
                    if (onComplete) {
                        onComplete();
                    }
                });
            });
        }
        return element;
    }

    error("Unable to find the sound \"" + key + "\"");
}

const songQueue = [];

let lastSong = undefined;

function playSong() {
    if(songQueue.length === 0) {
        for(let index = 0; index < audioResources.length; ++index) {
            const resource = audioResources[index];

            if(!resource.song || lastSong === resource)
                continue;

            songQueue.push(resource);
        }

        if(songQueue.length === 0) {
            setTimeout(playSong, 15);
            return;
        }
    }

    const playIndex = randInt(songQueue.length),
          resource = songQueue[playIndex];

    songQueue.splice(playIndex, 1);

    resource.element.onended = playSong;
    resource.element.play();

    lastSong = resource;
}

function loadAudio() {
    for(let index = 0; index < audioResources.length; ++index) {
        const resource = audioResources[index],
              resourceName = "audio(" + resource.key + ")";

        markResourceLoading(resourceName);
        
        const instances = (resource.instances !== undefined ? resource.instances : 1),
              element = document.createElement("audio");

        // The list we are going to fill with the loaded audio elements
        resource.elements = [];

        element.preload = "auto";
        element.onloadeddata = () => {
            resource.elements.push(element);
            for (let index = 1; index < instances; ++index) {
                resource.elements.push(element.cloneNode());
            }
            markResourceLoaded(resourceName)
        };
        element.src = resource.url;
    }
    
    updateAudioVolumes();
}



//
// IMAGES
//

const sprites = {
    "res/buttons.png": {
        "res/buttons/exit.png": "exit",
        "res/buttons/exit_active.png": "exit_active",

        "res/buttons/play.png": "play",
        "res/buttons/play_active.png": "play_active",

        "res/buttons/learn.png": "learn",
        "res/buttons/learn_active.png": "learn_active",

        "res/buttons/watch.png": "watch",
        "res/buttons/watch_active.png": "watch_active",
    },

    "res/dice.png": {
        "res/dice/up1.png": "diceUp1",
        "res/dice/up2.png": "diceUp2",
        "res/dice/up3.png": "diceUp3",
        "res/dice/down1.png": "diceDown1",
        "res/dice/down2.png": "diceDown2",
        "res/dice/down3.png": "diceDown3",
        "res/dice/darkShadow.png": "diceDarkShadow",
        "res/dice/lightShadow.png": "diceLightShadow"
    }
};

const imageResources = {
    "logo": "res/logo.png",
    "board": "res/board_light.png",
    "darkTile": "res/darkTile.png",
    "lightTile": "res/lightTile.png",
};

const loadedImageResources = {};
const loadedSpriteResources = {};
let loadedImageAnnotations = {};

function loadImageAnnotations() {
    const resourceName = "imageAnnotations";
    markResourceLoading(resourceName);

    const client = new XMLHttpRequest();
    client.onreadystatechange = function() {
        if (this.readyState !== 4)
            return;

        if (this.status !== 200) {
            error("Error " + this.status + " loading image annotations: " + this.responseText);
            markResourceLoaded(resourceName);
            return;
        }

        loadedImageAnnotations = JSON.parse(this.responseText);
        markResourceLoaded(resourceName);
    }.bind(client);
    client.open('GET', '/res/annotations.json');
    client.send();
}

function loadSprites() {
    for(let url in sprites) {
        if(!sprites.hasOwnProperty(url))
            continue;

        const resourceName = "sprite(" + url + ")";
        markResourceLoading(resourceName);

        const spriteResource = {
            url: url,
            image: new Image(),
            width: NaN,
            height: NaN,
            loaded: false
        };

        spriteResource.image.onload = function() {
            spriteResource.width = this.width;
            spriteResource.height = this.height;

            if(!spriteResource.width || !spriteResource.height) {
                error("[FATAL] Failed to load image resource \"" + spriteResource.url + "\", "
                    + "invalid width or height (" + spriteResource.width + " x " + spriteResource.height + ")");

                markResourceLoaded(resourceName);
                loadedSpriteResources[spriteResource.url] = undefined;
                return;
            }

            spriteResource.loaded = true;
            markResourceLoaded(resourceName);
        };

        spriteResource.image.src = url;
        loadedSpriteResources[url] = spriteResource;
    }
}

function splitSpritesIntoImages() {
    const spriteAnnotations = getImageAnnotation("sprites");

    if (!spriteAnnotations) {
        error("[FATAL] Sprite annotations are not loaded, and therefore sprites cannot be split");
        return;
    }

    for(let url in sprites) {
        const resource = loadedSpriteResources[url],
              mappings = sprites[url],
              annotations = spriteAnnotations[url];

        if (!resource || !resource.loaded) {
            error("[FATAL] Sprite " + url + " is not loaded, and therefore cannot be split");
            return;
        }

        if (!annotations) {
            error("[FATAL] Could not find sprite annotations for sprite " + url);
            return;
        }

        for(let mappedURL in mappings) {
            if (!mappings.hasOwnProperty(mappedURL))
                continue;

            const imageAnnotation = annotations[mappedURL],
                  identifier = mappings[mappedURL];

            if (!imageAnnotation) {
                error("[FATAL] Could not find annotations for image " + mappedURL + " within sprite " + url);
                return;
            }

            const image = renderResource(imageAnnotation["width"], imageAnnotation["height"], function(ctx) {
                ctx.drawImage(resource.image, -imageAnnotation["x_offset"], -imageAnnotation["y_offset"]);
            });

            loadedImageResources[identifier] = {
                key: identifier,
                image: image,
                loaded: true,
                sprite: true,
                width: image.width,
                height: image.height,
                scaled: [image]
            };
        }
    }
}

function loadImages() {
    loadImageAnnotations();
    loadSprites();

    for(let key in imageResources) {
        if(!imageResources.hasOwnProperty(key))
            continue;

        const resourceName = "image(" + key + ")";
        markResourceLoading(resourceName);

        const imageResource = {
            key: key,
            image: new Image(),
            loaded: false,
            width: NaN,
            height: NaN,
            scaled: []
        };
        imageResource.scaled.push(imageResource.image);

        imageResource.image.onload = function() {
            imageResource.width = this.width;
            imageResource.height = this.height;

            if(!imageResource.width || !imageResource.height) {
                error("[FATAL] Failed to load image resource \"" + imageResource.key + "\", "
                      + "invalid width or height (" + imageResource.width + " x " + imageResource.height + ")");

                markResourceLoaded(resourceName);
                loadedImageResources[imageResource.key] = undefined;
                return;
            }

            imageResource.loaded = true;
            markResourceLoaded(resourceName);
        };

        imageResource.image.src = imageResources[key];
        loadedImageResources[key] = imageResource;
    }
}

function getImageAnnotation(key) {
    const imageAnnotation = loadedImageAnnotations[key];

    if(!imageAnnotation) {
        error("Cannot find image annotation with key \"" + key + "\"");
        return null;
    }

    return imageAnnotation;
}

function getRawImageResource(key) {
    const imageResource = loadedImageResources[key];

    if(!imageResource) {
        error("Cannot find image with key \"" + key + "\"");
        return null;
    }

    return imageResource;
}

function getImageResource(key, width) {
    const imageResource = getRawImageResource(key);
    if(!imageResource)
        return null;

    const scaledowns = Math.floor(Math.log(imageResource.width / width) / Math.log(2)) - 1;

    if(!width || scaledowns <= 0)
        return imageResource.image;

    if(scaledowns >= imageResource.scaled.length) {
        let scaledownsDone = imageResource.scaled.length - 1,
            current = imageResource.scaled[scaledownsDone];

        while(scaledownsDone < scaledowns) {
            scaledownsDone += 1;

            const next = renderResource(current.width / 2, current.height / 2, function(ctx, canvas) {
                ctx.drawImage(current, 0, 0, canvas.width, canvas.height);
            });

            imageResource.scaled.push(next);
            current = next;
        }
    }

    return imageResource.scaled[scaledowns];
}

function getImageResourceFromHeight(key, height) {
    const imageResource = loadedImageResources[key];

    if(!imageResource) {
        error("Cannot find image with key \"" + key + "\"");
        return null;
    }

    const scale = height / imageResource.height,
          width = scale * imageResource.width;

    return getImageResource(key, width);
}

function renderResource(width, height, renderFunction) {
    if (width < 1 || height < 1)
        throw "Width and height must both be at least 1, was given " + width + "x" + height;

    const canvas = document.createElement("canvas"),
          ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    renderFunction(ctx, canvas);

    return canvas;
}

function calcImageWidth(image, height) {
    return image.width / image.height * height;
}

function calcImageHeight(image, width) {
    return image.height / image.width * width;
}
