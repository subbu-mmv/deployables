const recipes = document.querySelectorAll(".recipe");

const vegetarianFilter =
    document.getElementById("vegetarian");

const nonvegFilter =
    document.getElementById("nonveg");

const ingredientsContainer =
    document.getElementById("ingredients");

const ingredientToggle =
    document.getElementById("ingredientToggle");

const ingredientDropdown =
    document.getElementById("ingredientDropdown");

const ingredientSearch =
    document.getElementById("ingredientSearch");

const selectedIngredientsDisplay =
    document.getElementById("selectedIngredients");

const clearButton =
    document.getElementById("clearIngredients");

const resultCount =
    document.getElementById("resultCount");


/*
 * --------------------------------------------------
 * Collect all ingredients
 * --------------------------------------------------
 */

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


/*
 * --------------------------------------------------
 * Create alphabetically sorted ingredient list
 * --------------------------------------------------
 */

[...allIngredients]
    .sort((a, b) => a.localeCompare(b))
    .forEach(ingredient => {

        const label =
            document.createElement("label");

        label.className = "ingredient-option";

        label.dataset.ingredient = ingredient;

        label.innerHTML = `
            <input
                type="checkbox"
                value="${ingredient}">

            <span>${ingredient}</span>
        `;

        ingredientsContainer.appendChild(label);

    });


/*
 * --------------------------------------------------
 * Open / close dropdown
 * --------------------------------------------------
 */

ingredientToggle.addEventListener(
    "click",
    () => {

        ingredientDropdown.classList.toggle("open");

        if (ingredientDropdown.classList.contains("open")) {
            ingredientSearch.focus();
        }

    }
);


/*
 * Close dropdown when clicking outside
 * --------------------------------------------------
 */

document.addEventListener(
    "click",
    event => {

        const picker =
            document.querySelector(".ingredient-picker");

        if (!picker.contains(event.target)) {
            ingredientDropdown.classList.remove("open");
        }

    }
);


/*
 * --------------------------------------------------
 * Get selected ingredients
 * --------------------------------------------------
 */

function getSelectedIngredients() {

    return [
        ...ingredientsContainer
            .querySelectorAll("input:checked")
    ].map(input => input.value);

}


/*
 * --------------------------------------------------
 * Display selected ingredients
 * --------------------------------------------------
 */

function updateSelectedIngredients() {

    const selected =
        getSelectedIngredients();

    selectedIngredientsDisplay.innerHTML = "";

    if (selected.length === 0) {

        selectedIngredientsDisplay.textContent =
            "No ingredients selected.";

        return;
    }


    selectedIngredientsDisplay.textContent =
        selected.join(", ");

}


/*
 * --------------------------------------------------
 * Filter ingredient dropdown by search
 * --------------------------------------------------
 */

ingredientSearch.addEventListener(
    "input",
    () => {

        const search =
            ingredientSearch.value
                .toLowerCase()
                .trim();

        document
            .querySelectorAll(".ingredient-option")
            .forEach(option => {

                const ingredient =
                    option.dataset.ingredient
                        .toLowerCase();

                option.style.display =
                    ingredient.includes(search)
                        ? ""
                        : "none";

            });

    }
);


/*
 * --------------------------------------------------
 * Filter recipes
 * --------------------------------------------------
 */

function filterRecipes() {

    const selectedIngredients =
        getSelectedIngredients();

    let visibleCount = 0;


    recipes.forEach(recipe => {

        const type =
            recipe.dataset.type;

        const ingredients =
            recipe.dataset.ingredients
                .split(",")
                .map(x => x.trim());


        /*
         * Category filter
         */

        let categoryMatches = true;

        if (
            vegetarianFilter.checked ||
            nonvegFilter.checked
        ) {

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


        /*
         * Ingredient filter
         *
         * Selected ingredients mean:
         *
         * "These are ingredients I HAVE."
         *
         * Therefore a recipe matches if ALL of
         * its ingredients are among the things
         * I have.
         */

        const ingredientsMatch =
            selectedIngredients.length === 0 ||
            ingredients.every(
                ingredient =>
                    selectedIngredients.includes(ingredient)
            );


        /*
         * Final visibility
         */

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
        `${visibleCount} recipe${
            visibleCount === 1 ? "" : "s"
        } found`;

}


/*
 * --------------------------------------------------
 * Ingredient checkbox changes
 * --------------------------------------------------
 */

ingredientsContainer.addEventListener(
    "change",
    () => {

        updateSelectedIngredients();
        filterRecipes();

    }
);


/*
 * --------------------------------------------------
 * Category changes
 * --------------------------------------------------
 */

vegetarianFilter.addEventListener(
    "change",
    filterRecipes
);

nonvegFilter.addEventListener(
    "change",
    filterRecipes
);


/*
 * --------------------------------------------------
 * Clear ingredients
 * --------------------------------------------------
 */

clearButton.addEventListener(
    "click",
    () => {

        ingredientsContainer
            .querySelectorAll("input")
            .forEach(input => {
                input.checked = false;
            });

        updateSelectedIngredients();
        filterRecipes();

    }
);


/*
 * --------------------------------------------------
 * Initial state
 * --------------------------------------------------
 */

updateSelectedIngredients();
filterRecipes();
