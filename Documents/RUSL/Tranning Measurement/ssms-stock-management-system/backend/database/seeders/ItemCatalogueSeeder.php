<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\ItemCategory;
use Illuminate\Database\Seeder;
use RuntimeException;

class ItemCatalogueSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/stock_items.csv');
        $file = fopen($path, 'rb');

        if ($file === false) {
            throw new RuntimeException("Unable to open stock item catalogue: {$path}");
        }

        try {
            $headers = fgetcsv($file, null, ',', '"', '');
            $expectedHeaders = ['Code', 'Item name', 'Category', 'Unit', 'Min stock'];

            if ($headers !== $expectedHeaders) {
                throw new RuntimeException('Stock item catalogue has an unexpected header row.');
            }

            $seenCodes = [];
            $categoryNames = ['ti' => 'Writing Instruments'];

            while (($row = fgetcsv($file, null, ',', '"', '')) !== false) {
                if ($row === [null]) {
                    continue;
                }

                if (count($row) !== count($headers)) {
                    throw new RuntimeException('Stock item catalogue contains a malformed row.');
                }

                [$code, $name, $category, $unit, $minStock] = array_map('trim', $row);
                $normalizedCategory = $categoryNames[strtolower($category)] ?? $category;
                $minimum = filter_var($minStock, FILTER_VALIDATE_INT);

                if ($code === '' || $name === '' || $normalizedCategory === '' || $unit === ''
                    || $minimum === false || $minimum < 0 || isset($seenCodes[$code])) {
                    throw new RuntimeException("Stock item catalogue contains invalid data for code '{$code}'.");
                }

                $seenCodes[$code] = true;
                $category = ItemCategory::firstOrCreate(['name' => $normalizedCategory]);

                Item::updateOrCreate(
                    ['code' => $code],
                    [
                        'name' => $name,
                        'category_id' => $category->id,
                        'unit' => $unit,
                        'min_stock' => $minimum,
                    ]
                );
            }

            if ($seenCodes === []) {
                throw new RuntimeException('Stock item catalogue contains no items.');
            }
        } finally {
            fclose($file);
        }
    }
}
