'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const checkIfPlugin = (plugin) => {
    return (typeof plugin === "object" &&
        (typeof plugin.onInit === "function" ||
            typeof plugin.onUpdate === "function" ||
            typeof plugin.onDispose === "function" ||
            typeof plugin.onAddParticles === "function" ||
            typeof plugin.onMorph === "function"));
};

exports.checkIfPlugin = checkIfPlugin;
