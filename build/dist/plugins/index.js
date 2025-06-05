const checkIfPlugin = (plugin) => {
    return (typeof plugin === "object" &&
        (typeof plugin.onInit === "function" ||
            typeof plugin.onUpdate === "function" ||
            typeof plugin.onDispose === "function" ||
            typeof plugin.onAddParticles === "function" ||
            typeof plugin.onMorph === "function"));
};

export { checkIfPlugin };
