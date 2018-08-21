# h5p-math-display

Add LaTeX support to H5P using MathJax (and possibly other libraries in the future).

The MathDisplay library requires the appropriate update to your host system and the appropriate update to h5p-php-library.

1. Upload the library in the H5P library screen.
2. Add LaTex to your content using the common LaTeX notation:
   - `\(some LaTeX\)` for inline LaTeX
   - `\[some LaTeX\)` for block LaTeX
   - `$$some LaTeX$$` for block LaTeX

## Customizing the configuration
The MathDisplay library can be configured setting the environment variable `H5P_MATHDISPLAY_CONFIG` of your host system.

### Renderer ###
So far, the MathDisplay library supports MathJax and KaTeX (as of version 0.10-rc) for rendering math. By default, MathJax will be used, but you can tweak its settings or switch to KaTeX.

The MathDisplay library expects to find a `renderer` property within `H5P_MATHDISPLAY_CONFIG` which itself holds an object named after the library that's used.
In the case of MathJax, this object uses the same structure that you may be accustomed to by the [MathJax in-line configuration options](https://docs.mathjax.org/en/latest/configuration.html#using-in-line-configuration-options).
In the case of KaTeX (works properly as of version 0.10), this object uses the same structure that you may be accustomed to by the [KaTeX options](https://khan.github.io/KaTeX/docs/options.html) and the [options of KaTeX's autorender extension](https://khan.github.io/KaTeX/docs/autorender.html).

### Observers ###
There are different "observers" that will tell the renderer that the page might need an update. It should not be necessary to use all observers at the same time, but it is possible.

1. `mutationObserver`: Will constantly listen to DOM changes and trigger an update if a change occurs. Parameters:
    - `cooldown`: Number of milliseconds that updates will be triggered after an update
2. `domChangedListener`: Will trigger an update if it detects an H5P Event with the handle `domChanged` by a content type.
3. `interval`: Will repreatedly trigger an update after a defined interval. Parameters:
    - `time`: Number of milliseconds between each update.

By default, the mutationObserver will be used with a cooldown period of 500ms. Also, the domChangedListener will be used by default.

### Example: Drupal 7 with MathJax
You can alter the default configuration of the MathDisplay library by adding something like this to the `settings.php` file within your `/sites/YOUR_SITE` folder, typically it's `/sites/default`.

    $conf['h5p_mathdisplay_config'] = array(
      "observers" => array(
        array("name" => "mutationObserver", "params" => array("cooldown" => 500)),
        array("name" => "domChangedListener"),
        // array("name" => "interval", "params" => array("time" => 1000))
      ),
      "renderer" => array(
        "mathjax" => array(
          // You should also be able to use a local copy of MathJax by providing the correct data here
          "src" => "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js",
          "config" => array(
            "extensions" => array("tex2jax.js"),
            "jax" => array("input/TeX", "output/HTML-CSS"),
            "tex2jax" => array(
              // Important, otherwise MathJax will be rendered inside CKEditor
              ignoreClass => "ckeditor"
            ),
            "messageStyle" => "none"
          )
        )
      )
    );

### Example: Drupal 7 with KaTeX
You can alter the default configuration of the MathDisplay library to use KaTeX by adding something like this to the `settings.php` file within your `/sites/YOUR_SITE` folder, typically it's `/sites/default`.

    $conf['h5p_mathdisplay_config'] = array(
      "observers" => array(
        array("name" => "mutationObserver", "params" => array("cooldown" => 500)),
        array("name" => "domChangedListener"),
        array("name" => "interval", "params" => array("time" => 1000))
      ),
      "renderer" => array(
        "katex" => array(
          // You should also be able to use a local copy of KaTeX by providing the correct data here.
          "src" => "https://cdn.jsdelivr.net/npm/katex@0.10.0-rc/dist/katex.min.js",
          "integrity" => "sha384-ttOZCNX+557qK00I95MHw9tttcgWn2PjR/bXecuEvENq6nevFtwSSQ6bYEN6AetB",
          "stylesheet" => array(
            href: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-rc/dist/katex.min.css',
            integrity: 'sha384-JwmmMju6Z7M9jiY4RXeJLoNb3aown2QCC/cI7JPgmOLsn3n33pdwAj0Ml/CMMd1W'
          ),
          "autorender": array(
            src: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-rc/dist/contrib/auto-render.min.js',
            integrity: 'sha384-yACMu8JWxKzSp/C1YV86pzGiQ/l1YUfE8oPuahJQxzehAjEt2GiQuy/BIvl9KyeF'
          ),
          // Common KaTeX options
          "config": array(
            // Important, otherwise KaTeX will be rendered inside CKEditor
            "ignoredClasses": array("ckeditor")
          )
        )
      )
    );

### Example: WordPress with MathJax
You can alter the default configuration of the MathDisplay library by adding something like this to the `wp-config.php` file.

    define('H5P_MATHDISPLAY_CONFIG',
      array(
        'observers' => array(
          array('name' => 'mutationObserver', 'params' => array('cooldown' => 500)),
          array('name' => 'domChangedListener'),
          // array('name' => 'interval', 'params' => array('time' => 1000))
        ),
        'renderer' => array(
          'mathjax' => array(
            // You should also be able to use a local copy of MathJax by providing the correct data here
            'src' => 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js',
            'config' => array(
              'extensions' => array('tex2jax.js'),
              'jax' => array('input/TeX','output/HTML-CSS'),
              'tex2jax' => array(
                // Important, otherwise MathJax will be rendered inside CKEditor
                ignoreClass => 'ckeditor'
              ),
              'messageStyle' => 'none'
            )
          )
        )
      )
    );

### Example: WordPress with KaTeX
You can alter the default configuration of the MathDisplay library to use KaTeX by adding something like this to the `wp-config.php` file.

    define('H5P_MATHDISPLAY_CONFIG',
      array(
        'observers' => array(
          array('name' => 'mutationObserver', 'params' => array('cooldown' => 500)),
          array('name' => 'domChangedListener'),
          // array('name' => 'interval', 'params' => array('time' => 1000))
        ),
        "renderer" => array(
          "katex" => array(
            // You should also be able to use a local copy of KaTeX by providing the correct data here.
            "src" => "https://cdn.jsdelivr.net/npm/katex@0.10.0-rc/dist/katex.min.js",
            "integrity" => "sha384-ttOZCNX+557qK00I95MHw9tttcgWn2PjR/bXecuEvENq6nevFtwSSQ6bYEN6AetB",
            "stylesheet" => array(
              href: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-rc/dist/katex.min.css',
              integrity: 'sha384-JwmmMju6Z7M9jiY4RXeJLoNb3aown2QCC/cI7JPgmOLsn3n33pdwAj0Ml/CMMd1W'
            ),
            "autorender": array(
              src: 'https://cdn.jsdelivr.net/npm/katex@0.10.0-rc/dist/contrib/auto-render.min.js',
              integrity: 'sha384-yACMu8JWxKzSp/C1YV86pzGiQ/l1YUfE8oPuahJQxzehAjEt2GiQuy/BIvl9KyeF'
            ),
            // Common KaTeX options
            "config": array(
              // Important, otherwise KaTeX will be rendered inside CKEditor
              "ignoredClasses": array("ckeditor")
            )
          )
        )
      )
    );
