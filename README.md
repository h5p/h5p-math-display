# h5p-math-display

Add LaTeX support to H5P using MathJax (and possibly other libraries in the future).

The MathDisplay library requires the appropriate update to your host system and the appropriate update to h5p-php-library.

1. Upload the library in the H5P library screen.
2. Add LaTex to your content using the common LaTeX notation:
   - `\(some LaTeX\)` for inline LaTeX
   - `\[some LaTeX\]` for block LaTeX
   - `$$some LaTeX$$` for block LaTeX

**Do note the configuration option described below is only supported if you're using <= 1.0.8. Any newer version uses mathjax with a predefined setup.**

<details><summary>Customizing the configuration</summary>

<p>
The MathDisplay library can be configured setting the environment variable `H5P_MATHDISPLAY_CONFIG` of your host system.

### Renderer ###
So far, the MathDisplay library supports MathJax for rendering math. Support for other libraries such as KaTeX could be added in the future.

The MathDisplay library expects to find a `renderer` property within `H5P_MATHDISPLAY_CONFIG` which itself holds an object named after the library that's used.
In the case of MathJax, this object uses the same structure that you may be accustomed to by the [MathJax in-line configuration options](https://docs.mathjax.org/en/latest/configuration.html#using-in-line-configuration-options).

TODO: List the default values.

### Observers ###
There are different "observers" that will tell the renderer that the page might need an update. It is not necessary to use all observers at the same time, but it is possible.

1. `mutationObserver`: Will constantly listen to DOM changes and trigger an update if a change occurs. Parameters:
    - `cooldown`: Number of milliseconds that updates will be triggered after an update
2. `domChangedListener`: Will trigger an update if it detects an H5P Event with the handle `domChanged` by a content type.
3. `interval`: Will repreatedly trigger an update after a defined interval. Parameters:
    - `time`: Number of milliseconds between each update.

TODO: List the default values after tweaking.

### Example: Drupal 7
You can alter the default configuration of the MathDisplay library by adding something like this to the `settings.php` file within your `/sites/YOUR_SITE` folder, typically it's `/sites/default`.
```php
$conf['h5p_library_config'] = array(
  "H5P.MathDisplay" => array(
    "observers" => array(
      array("name" => "mutationObserver", "params" => array("cooldown" => 500)),
      array("name" => "domChangedListener"),
      array("name" => "interval", "params" => array("time" => 1000))
    ),
    "renderer" => array(
      "mathjax" => array(
        "src" => "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js",
        "config" => array(
          "extensions" => array("tex2jax.js"),
          "jax" => array("input/TeX", "output/HTML-CSS"),
          "tex2jax" => array(
            // Important, otherwise MathJax will be rendered inside CKEditor
            "ignoreClass" => "ckeditor"
          ),
          "messageStyle" => "none"
        )
      )
    )
  )
);
```

### Example: Drupal 8
You can alter the default configuration of the MathDisplay library by adding something like this to the `settings.php` file within your `/sites/YOUR_SITE` folder, typically it's `/sites/default`.
```php
$config['h5p.settings']['h5p_library_config'] = array(
  'H5P.MathDisplay' => array(
    "observers" => array(
      array("name" => "mutationObserver", "params" => array("cooldown" => 500)),
      array("name" => "domChangedListener"),
      array("name" => "interval", "params" => array("time" => 1000))
    ),
    "renderer" => array(
      "mathjax" => array(
        "src" => "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js",
        "config" => array(
          "extensions" => array("tex2jax.js"),
          "jax" => array("input/TeX", "output/HTML-CSS"),
          "tex2jax" => array(
            // Important, otherwise MathJax will be rendered inside CKEditor
            "ignoreClass" => "ckeditor"
          ),
          "messageStyle" => "none"
        )
      )
    )
  )
);
```

### Example: WordPress
You can alter the default configuration of the MathDisplay library by adding something like this to the `wp-config.php` file.

```php
define('H5P_LIBRARY_CONFIG', array(
  "H5P.MathDisplay" => array(
    "observers" => array(
      array("name" => "mutationObserver", "params" => array("cooldown" => 500)),
      array("name" => "domChangedListener"),
      array("name" => "interval", "params" => array("time" => 1000))
    ),
    "renderer" => array(
      "mathjax" => array(
        "src" => "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js",
        "config" => array(
          "extensions" => array("tex2jax.js"),
          "jax" => array("input/TeX", "output/HTML-CSS"),
          "tex2jax" => array(
            // Important, otherwise MathJax will be rendered inside CKEditor
            "ignoreClass" => "ckeditor"
          ),
          "messageStyle" => "none"
        )
      )
    )
  )
));
```

### Example: Moodle
You can alter the default configuration of the MathDisplay library by adding something like this to the `config.php` file.

```php
$CFG->mod_hvp_library_config = array(
  "H5P.MathDisplay" => array(
    "observers" => array(
      array("name" => "mutationObserver", "params" => array("cooldown" => 500)),
      array("name" => "domChangedListener"),
      array("name" => "interval", "params" => array("time" => 1000))
    ),
    "renderer" => array(
      "mathjax" => array(
        "src" => "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js",
        "config" => array(
          "extensions" => array("tex2jax.js"),
          "jax" => array("input/TeX", "output/HTML-CSS"),
          "tex2jax" => array(
            // Important, otherwise MathJax will be rendered inside CKEditor
            "ignoreClass" => "ckeditor"
          ),
          "messageStyle" => "none"
        )
      )
    )
  )
);

```
</p></details>
