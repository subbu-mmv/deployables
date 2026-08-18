const recipes = document.querySelectorAll(".recipe");

const vegetarianFilter = document.getElementById("vegetarian");
const nonvegFilter = document.getElementById("nonveg");

const ingredientsContainer = document.getElementById("ingredients");
const clearButton = document.getElementById("clearIngredients");
const resultCount = document.getElementById("resultCount");


// Find all ingredients used by all recipes

const allIngredients = new Set();

recipes.forEach(recipe => {

    const ingredients =
        recipe.dataset.ingredients
            .split(",")
            .map(x => x.trim());

    ingredients.forEach(ingredient => {
        allIngredients.add(ingredient);
    });

});


// Create ingredient checkboxes

[...allIngredients]
    .sort()
    .forEach(ingredient => {

        const label = document.createElement("label");

        label.className = "ingredient";

        label.innerHTML = `
            <input
                type="checkbox"
                value="${ingredient}">
            ${ingredient}
        `;

        ingredientsContainer.appendChild(label);
    });


// Get selected ingredients

function getSelectedIngredients() {

    return [
        ...ingredientsContainer.querySelectorAll(
            "input:checked"
        )
    ].map(input => input.value);

}


// Apply filters

function filterRecipes() {

    const selectedIngredients =
        getSelectedIngredients();

    let visibleCount = 0;

    recipes.forEach(recipe => {

        const type = recipe.dataset.type;

        const ingredients =
            recipe.dataset.ingredients
                .split(",")
                .map(x => x.trim());


        // Category filter

        let categoryMatches = true;

        if (vegetarianFilter.checked ||
            nonvegFilter.checked) {

            categoryMatches = false;

            if (
                vegetarianFilter.checked &&
                type === "vegetarian"
            ) {
                categoryMatches = true;
            }

            if (
                nonvegFilter.checked &&
                type === "nonveg"
            ) {
                categoryMatches = true;
            }
        }


        // Ingredient filter

        const ingredientsMatch =
            selectedIngredients.every(
                ingredient =>
                    ingredients.includes(ingredient)
            );


        // Final result

        const visible =
            categoryMatches &&
            ingredientsMatch;

        recipe.style.display =
            visible ? "" : "none";


        if (visible) {
            visibleCount++;
        }

    });


    resultCount.textContent =
        `${visibleCount} recipe${visibleCount === 1 ? "" : "s"} found`;
}


// Listen for changes

vegetarianFilter.addEventListener(
    "change",
    filterRecipes
);

nonvegFilter.addEventListener(
    "change",
    filterRecipes
);

ingredientsContainer.addEventListener(
    "change",
    filterRecipes
);


// Clear ingredient selection

clearButton.addEventListener(
    "click",
    () => {

        ingredientsContainer
            .querySelectorAll("input")
            .forEach(input => {
                input.checked = false;
            });

        filterRecipes();
    }
);


// Initial state

filterRecipes();

