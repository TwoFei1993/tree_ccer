from paths import get_data_root

def test_get_data_root_finds_existing_directory_with_known_file():
    root = get_data_root()
    assert (root / "Plot20m_2018.csv").exists()
